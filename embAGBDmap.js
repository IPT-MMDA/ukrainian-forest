var table = ee.FeatureCollection("projects/monforest/assets/agdb_emb_allclasses2020"),
    table2 = ee.FeatureCollection("projects/monforest/assets/agdb_emb_allclasses2021"),
    table3 = ee.FeatureCollection("projects/monforest/assets/agdb_emb_allclasses2022"),
    table4 = ee.FeatureCollection("projects/monforest/assets/agdb_emb_allclasses2024"),
    table5 = ee.FeatureCollection("users/sofidrozd13/regions_36");

// ============================================================
// Train model
// ============================================================

var roi = table5
var scale = 10
var crs = 'EPSG:3035'

var all = table.merge(table2).merge(table3).merge(table4);

all = all.map(function(f){ return f.set('uid', f.id()); });
print('Preview all:', all.limit(5));

var years = ee.List(all.aggregate_array('year')).distinct();

var train = ee.FeatureCollection(
  years.map(function(y){
    return all.filter(ee.Filter.eq('year', y)).limit(20000);
  })
).flatten();


print('Total train points:', train.size());


var trainIds = train.aggregate_array('uid');

var test = all.filter(
  ee.Filter.inList('uid', trainIds).not()
);

print('Test size:', test.size());

Export.table.toDrive({
  collection: train,
  folder:"AGBD points",
  description: 'agdb_emb_train'
});

Export.table.toDrive({
  collection: test,
  folder:"AGBD points",
  description: 'agdb_emb_test'
});

print("Total train healthy tree class only", train
.filter(ee.Filter.inList("mode",[10,18]))
.size())

for (var year = 2020; year<2026; year++){
  
  year = year.toString()
  print (year)
  
  var train_point = train.filter(ee.Filter.eq("year",year))
  var test_point = test.filter(ee.Filter.eq("year",year))
  var all_point = all.filter(ee.Filter.eq("year",year))

print("All healthy tree class only", all_point
.filter(ee.Filter.inList("mode",[10,18]))
.size())

print("Train healthy tree class only", train_point
.filter(ee.Filter.inList("mode",[10,18]))
.size())
print("Test healthy tree class only", test_point
.filter(ee.Filter.inList("mode",[10,18]))
.size())

}
var parameter = 'agbd'


var featureNames_EMB = ['A00','A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12','A13','A14',
 'A15','A16','A17','A18','A19','A20','A21','A22','A23','A24','A25','A26','A27','A28','A29',
 'A30','A31','A32','A33','A34','A35','A36','A37','A38','A39','A40','A41','A42','A43','A44',
 'A45','A46','A47','A48','A49','A50','A51','A52','A53','A54','A55','A56','A57','A58','A59',
 'A60','A61','A62','A63']



var runRF = function(bands, label) {
  var model = ee.Classifier.smileRandomForest({
    numberOfTrees: 150,
    variablesPerSplit: 15,
    minLeafPopulation: 5,
    seed: 42
  }).setOutputMode('REGRESSION')
    .train({features: train, classProperty: parameter,
            inputProperties: bands});

  var predicted = test.classify(model, 'pred');

  // Pearson r
  var r = ee.Number(predicted.reduceColumns(
    ee.Reducer.pearsonsCorrelation(), [parameter,'pred']
  ).get('correlation'));

  // RMSE
  var rmse = ee.Number(predicted.map(function(f) {
    var diff = ee.Number(f.get(parameter)).subtract(ee.Number(f.get('pred')));
    return f.set('sq_err', diff.multiply(diff));
  }).reduceColumns(ee.Reducer.mean(), ['sq_err']).get('mean')).sqrt();

  // R2
  var mean_cover = ee.Number(
    test.reduceColumns(ee.Reducer.mean(), [parameter]).get('mean')
  );
  var ss_tot = ee.Number(test.map(function(f) {
    var diff = ee.Number(f.get(parameter)).subtract(mean_cover);
    return f.set('ss', diff.multiply(diff));
  }).reduceColumns(ee.Reducer.sum(), ['ss']).get('sum'));

  var ss_res = ee.Number(predicted.map(function(f) {
    var diff = ee.Number(f.get(parameter)).subtract(ee.Number(f.get('pred')));
    return f.set('ss', diff.multiply(diff));
  }).reduceColumns(ee.Reducer.sum(), ['ss']).get('sum'));

  var r2 = ee.Number(1).subtract(ss_res.divide(ss_tot));

  print(label,
    'r =', r,
    'R² =', r2,
    'RMSE =', rmse);

  return model;
};

var model_emb = runRF(featureNames_EMB,parameter)


var predicted_emb = test.classify({
  classifier: model_emb,
  outputName: 'agbd_predicted'
});

var chart = ui.Chart.feature.byFeature({
  features: predicted_emb.select(['agbd', 'agbd_predicted']).limit(5000),
  xProperty: 'agbd',
  yProperties: ['agbd_predicted'],
}).setChartType('ScatterChart')
  .setOptions({
    title: 'EMB-based Aboveground Biomass Density (Mg/Ha)',
    dataOpacity: 0.8,
    hAxis: {'title': 'Observed'},
    vAxis: {'title': 'Predicted'},
    legend: {position: 'right'},
    series: {
      0: {
        visibleInLegend: false,
        color: '#525252',
        pointSize: 3,
        pointShape: 'triangle'      },
    },
    trendlines: {
      0: {
        type: 'linear',
        color: 'black',
        lineWidth: 1,
        pointSize: 0,
        visibleInLegend: true,
        showR2: true
      }
    }

});
print(chart);

var chart = ui.Chart.feature.byFeature({
  features: predicted_emb.filter(ee.Filter.inList("mode",[10,18])).select(['agbd', 'agbd_predicted']).limit(5000),
  xProperty: 'agbd',
  yProperties: ['agbd_predicted'],
}).setChartType('ScatterChart')
  .setOptions({
    title: 'EMB-based Forest Aboveground Biomass Density (Mg/Ha)',
    dataOpacity: 0.8,
    hAxis: {'title': 'Observed'},
    vAxis: {'title': 'Predicted'},
    legend: {position: 'right'},
    series: {
      0: {
        visibleInLegend: false,
        color: '#525252',
        pointSize: 3,
        pointShape: 'triangle'      },
    },
    trendlines: {
      0: {
        type: 'linear',
        color: 'black',
        lineWidth: 1,
        pointSize: 0,
        visibleInLegend: true,
        showR2: true
      }
    }

});
print(chart);


///**********************************************************************************
// Mapping
// ============================================================

var years = ['2020','2021','2022','2023','2024','2025']

for (var i = 0; i<6; i++){
var year = years[i];

////////////////////EMBEDDINGS MAPS//////////////////////////////////

var startDate = ee.Date(year+"-01-01");
var endDate = startDate.advance(1, 'year');

var embeddings = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL');

var embeddingsFiltered = embeddings
  .filter(ee.Filter.date(startDate, endDate))
  .filter(ee.Filter.bounds(roi))
  
// Extract the projection of the first band of the first image
var embeddingsProjection = ee.Image(embeddingsFiltered.first()).select(0).projection();

// Set the projection of the mosaic to the extracted projection
var embeddingsImage = embeddingsFiltered.mosaic()
  .setDefaultProjection(embeddingsProjection).clip(roi)

var predicted = embeddingsImage.classify(model_emb, parameter)

Map.addLayer(predicted, {min:30, max:300, palette:['white','lightgreen','darkgreen']}, "emb-based "+parameter + year,0);

Export.image.toDrive({
  image: predicted.round().int16(),
  description: parameter+'_' + year+'onallclass_emb',
  folder: parameter+'_trained_on_all_classes_20_23_embeddings_based_updated',
  scale:scale,
  crs:crs,
  fileFormat: 'GeoTIFF',
  maxPixels: 1e13,
  region: roi,
    formatOptions: {
    noData: 0,
    cloudOptimized: true
  }
})
}