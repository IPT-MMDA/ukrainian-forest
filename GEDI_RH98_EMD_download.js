
var year = 2024;
var ukr = ee.FeatureCollection("projects/ukraineclassification/assets/Ukraine");

var regions = ee.FeatureCollection("projects/ukraineclassification/assets/regions_84");
var regionNames = regions.aggregate_array('TITLE');

var start_date   = ee.Date(year+"-04-01");
var end_date     = ee.Date(year+"-10-01");
var start_date_1 = ee.Date(year+"-04-15");
var end_date_1   = ee.Date(year+"-08-01");
var start_date_2 = ee.Date(year+"-08-01");

var end_date_1   = ee.Date(year+"-08-01");
var end_date_2   = ee.Date(year+"-10-01");


var MAX_CLOUD_PROBABILITY = 30;
var scale = 10;
var step  = 12;

var maps = ee.Dictionary({
  "2020": ee.Image("projects/ukraineclassification/assets/Map2020_cor_art_wet_Sad_Aggr"),
  "2021": ee.Image("projects/ukraineclassification/assets/Map2021_cor_art_wet_Sad_Aggr"),
  "2022": ee.Image("projects/ukraineclassification/assets/Map2022_cor_art_wet_Sad_Aggr"),
  "2023": ee.Image("projects/ukraineclassification/assets/Map2023_cor_art_wet_Sad_Aggr"),
  "2024": ee.Image("projects/ukraineclassification/assets/Map2024_cor_art_wet_Sad_Aggr"),
  "2025": ee.Image("projects/ukraineclassification/assets/SummerMap_Ukraine_2025_WB_tobacco")
});

var forestMap = ee.Image(maps.get(String(year))).rename('maps');
var forestMask = forestMap.eq(10).or(forestMap.eq(18));

// DEM
var glo30 = ee.ImageCollection('COPERNICUS/DEM/GLO30')
  .filter(ee.Filter.bounds(ukr)).select('DEM');
var demProj  = glo30.first().select(0).projection();
var elevation = glo30.mosaic().setDefaultProjection(demProj);
var slopeGlo  = ee.Terrain.slope(elevation);

var qualityMask_l2a = function(im) {
  return im
    .updateMask(im.select('quality_flag').eq(1)) 
    .updateMask(im.select('degrade_flag').eq(0))

    .updateMask(im.select('sensitivity').gt(0.97))
    .updateMask(im.select('solar_elevation').lt(0))
    
    .updateMask(slopeGlo.lte(15));
};

// Embeddings
var embeddings = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL')
  .filterDate(year+'-01-01', (year+1)+'-01-01')
  .filterBounds(ukr)
  .mosaic();

// var nonForestMask = forestMask.not();

var gedi_img = ee.ImageCollection('LARSE/GEDI/GEDI02_A_002_MONTHLY')
  .filterDate(start_date, end_date)
  .filterBounds(ukr)
  .map(qualityMask_l2a)
  .select('rh98')
  .mosaic()
  .updateMask(ForestMask)
  .rename('rh98');



var ones = gedi_img.multiply(0).add(1).toInt().rename('ones');

var gedi_pts = gedi_img.addBands(ones).stratifiedSample({
  numPoints: 100000,  // всі з одного класу, думаю таки більш природний розподіл
  classBand: 'ones',
  //region: geometry,
  region: ukr.geometry(),
  scale: 25,
  tileScale: 16,
  seed: 42,
  geometries: true
});


//print('GEDI точок:', gedi_pts.size());

var sampled = embeddings.reduceRegions({
  collection: gedi_pts,
  reducer: ee.Reducer.mean(),
  scale: 25,
  tileScale: 4
});

var sampled_clean = sampled.filter(
  ee.Filter.notNull(['A00', 'A01', 'rh98'])
);

//var withRand = sampled_filtered.randomColumn('rand', 42);
var withRand = sampled_clean.randomColumn('rand', 42);
var train = withRand.filter(ee.Filter.lt('rand', 0.5));
var test  = withRand.filter(ee.Filter.gte('rand', 0.5));
//print('Train / Test:', train.size(), '/', test.size());

var exportFunc = function(collection, desc) {
  return Export.table.toDrive({
    collection: collection.map(function(f) {
      return f.set({
        'lon': f.geometry().coordinates().get(0),
        'lat': f.geometry().coordinates().get(1)
      }).setGeometry(null);
    }),
    description: desc + '_' + year,
    folder: 'rh98_samples_' + year,
    fileFormat: 'CSV'
  });
};

// exportFunc(train, 'train_rh98');
exportFunc(test, 'test_rh98_50k_forest');