var points = ee.FeatureCollection('projects/ukrainian-forest/assets/rh98_emb_train').filter(ee.Filter.notNull(['rh98']));
var test = ee.FeatureCollection('projects/ukrainian-forest/assets/test_rh98').filter(ee.Filter.notNull(['rh98']));

var parameter = 'rh98'

var featureNames_EMB = ['A00','A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12','A13','A14',
 'A15','A16','A17','A18','A19','A20','A21','A22','A23','A24','A25','A26','A27','A28','A29',
 'A30','A31','A32','A33','A34','A35','A36','A37','A38','A39','A40','A41','A42','A43','A44',
 'A45','A46','A47','A48','A49','A50','A51','A52','A53','A54','A55','A56','A57','A58','A59',
 'A60','A61','A62','A63']

print(points.limit(10).aggregate_array("rh98"))
  
var model_emb = ee.Classifier.smileRandomForest(20)
  .setOutputMode('REGRESSION')
  .train({
    features: points,
    classProperty: parameter,
    inputProperties: featureNames_EMB
  });

var predicted_emb = test.classify({
  classifier: model_emb,
  outputName: 'rh98_predicted'
});



// Calculate RMSE
var calculateRmse = function(input) {
    var observed = ee.Array(
      input.aggregate_array('rh98'));
    var predicted = ee.Array(
      input.aggregate_array('rh98_predicted'));
    var rmse = observed.subtract(predicted).pow(2)
      .reduce('mean', [0]).sqrt().get([0]);
    return rmse;
};

var rmse_emb = calculateRmse(predicted_emb);
print("\n", 'RMSE EMB-model all', rmse_emb);

var chart = ui.Chart.feature.byFeature({
  features: predicted_emb.select(['rh98', 'rh98_predicted']).limit(5000),
  xProperty: 'rh98',
  yProperties: ['rh98_predicted'],
}).setChartType('ScatterChart')
  .setOptions({
    title: 'EMB-based rh98',
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
var crs = 'EPSG:3035';
var scale = 10;

////////////////////EMBEDDINGS MAPS//////////////////////////////////
var roi = ee.FeatureCollection("projects/ukraineclassification/assets/Ukraine")


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
  .setDefaultProjection(embeddingsProjection).clip(roi).addBands(ee.Image(150).rename("day"))
  //  .updateMask(image.eq(10));

var predicted = embeddingsImage.classify(model_emb, parameter)


Map.addLayer(predicted, {min:0, max:55, palette:['white','lightgreen','darkgreen']}, "emb-based "+parameter + year,0);

Export.image.toDrive({
  image: predicted.multiply(100).toUint16().clip(roi),
  description: parameter+'_' + year+'_emb',
  folder: parameter+'_mapAllClasses',
  scale:scale,
  crs:crs,
  fileFormat: 'GeoTIFF',
  maxPixels: 1e13,
  formatOptions: {cloudOptimized: true}
})
}
