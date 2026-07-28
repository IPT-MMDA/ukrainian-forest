
var year = 2022;//change the year
var ukr = ee.FeatureCollection("projects/ukraineclassification/assets/Ukraine"); // boudaries

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
var slopeLayer = slopeGlo.rename('slope').multiply(10).toUint16();

// Embeddings
var embeddings = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL')
  .filterDate(year+'-01-01', (year+1)+'-01-01')
  .filterBounds(ukr)
  .mosaic();


//print('Всього ознак:', full_stack.bandNames().size());

// GEDI L2B 
var qualityMask_l2b = function(im) {
  return im
    .updateMask(im.select('l2b_quality_flag').eq(1))
    .updateMask(im.select('degrade_flag').eq(0))
    .updateMask(im.select('algorithmrun_flag').eq(1))
    //.updateMask(im.select('sensitivity').gte(0).and(im.select('sensitivity').lte(1)))
    //.updateMask(im.select('cover').gte(0).and(im.select('cover').lte(1)))
    .updateMask(im.select('sensitivity').gt(0.97))
    .updateMask(im.select('solar_elevation').lt(0))         //  night
    .updateMask(im.select('cover').gt(0.05))                
    .updateMask(im.select('cover').lt(0.98))               
    .updateMask(slopeGlo.lte(15));
};

var gedi_img = ee.ImageCollection('LARSE/GEDI/GEDI02_B_002_MONTHLY')
  .filterDate(start_date, end_date)
  .filterBounds(ukr)
  .map(qualityMask_l2b)
  .select('cover')
  .mosaic()
  .updateMask(forestMask)
  .rename('cover');



var ones = gedi_img.multiply(0).add(1).toInt().rename('ones');

var gedi_pts = gedi_img.addBands(ones).stratifiedSample({
  numPoints: 50000,  // всі з одного класу, думаю таки більш природний розподіл
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
  ee.Filter.notNull(['A00', 'A01', 'cover'])
);

//var withRand = sampled_filtered.randomColumn('rand', 42);
var withRand = sampled_clean.randomColumn('rand', 42);
var train = withRand.filter(ee.Filter.lt('rand', 0.5));
var test  = withRand.filter(ee.Filter.gte('rand', 0.5));
//print('Train / Test:', train.size(), '/', test.size());

Export.table.toDrive({
  collection: test.map(function(f) {
    return f.set({
      'lon': f.geometry().coordinates().get(0),
      'lat': f.geometry().coordinates().get(1)
    }).setGeometry(null);
  }),
  description: 'test_coverOne_' + year,
  folder: 'cover_mapOne_' + year,
  fileFormat: 'CSV'
});


Export.table.toDrive({
  collection: train.map(function(f) {
    return f.set({
      'lon': f.geometry().coordinates().get(0),
      'lat': f.geometry().coordinates().get(1)
    }).setGeometry(null);
  }),
  description: 'train_coverOne_' + year,
  folder: 'cover_mapOne_' + year,
  fileFormat: 'CSV'
});