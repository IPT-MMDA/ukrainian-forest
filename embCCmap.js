var year = 2025
var ukr = ee.FeatureCollection("projects/ukraineclassification/assets/Ukraine");
var train = ee.FeatureCollection(  'projects/ukraineclassification/assets/train_for_gee');

// Embeddings
var embeddings = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL')
  .filterDate(year+'-01-01', (year+1)+'-01-01')
  .filterBounds(ukr)
  .mosaic();


var runRF = function(bands, label) {
  var model = ee.Classifier.smileRandomForest({
    numberOfTrees: 150,
    variablesPerSplit: 15,
    minLeafPopulation: 5,
    seed: 42
  }).setOutputMode('REGRESSION')
    .train({features: train, classProperty: 'cover',
            inputProperties: bands});

  return model;
};

var emb_only        = runRF(embeddings.bandNames(), 'emb: only');

var cover_map_embeddings = embeddings.classify(emb_only)
  .rename('cover');


Export.image.toDrive({
  image: cover_map_embeddings.multiply(100).toUint8().clip(ukr),
  description: 'cover_mapOne_' + year + '_ukraine',
  folder: 'cover_mapOne_' + year,
  scale: 10,
  fileFormat: 'GeoTIFF',
  maxPixels: 1e13,
  //region: geometry,
  region: ukr.geometry(),
  formatOptions: {cloudOptimized: true}
});