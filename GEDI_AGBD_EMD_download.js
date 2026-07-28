var years = [2020,2021,2022,2024]

for (var i = 0; i<4; i++){
  var year = years[i];
  
  var start_date   = ee.Date(year+"-04-01");
  var end_date     = ee.Date(year+"-10-01");


  var ukr = ee.FeatureCollection("projects/ukraineclassification/assets/Ukraine");
  
  var regions = ee.FeatureCollection("projects/ukraineclassification/assets/regions_84");
  var regionNames = regions.aggregate_array('TITLE');
  
  var scale = 10;
  
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

  // Embeddings
  var embeddings = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL')
    .filterDate(year+'-01-01', (year+1)+'-01-01')
    .filterBounds(ukr)
    .mosaic();
  
  
  // GEDI 
  var qualityMask_l4a = function(im) {
    return im
      .updateMask(im.select('l4_quality_flag').eq(1))
      .updateMask(im.select('degrade_flag').eq(0))
      .updateMask(im.select('algorithm_run_flag').eq(1))
      .updateMask(im.select('sensitivity').gt(0.97))
      .updateMask(im.select('solar_elevation').lt(0))         
      .updateMask(im.select('agbd').gt(10))                
      .updateMask(im.select('agbd').lt(400))               
      .updateMask(slopeGlo.lte(15));
  };
  
  var gedi_img = ee.ImageCollection('LARSE/GEDI/GEDI04_A_002_MONTHLY')
    .filterDate(start_date, end_date)
    .filterBounds(ukr)
    .map(qualityMask_l4a)
    .select('agbd')
    .mosaic()
    .updateMask(forestMask)
  
  
  
  var ones = gedi_img.multiply(0).add(1).toInt().rename('ones');
  
  var gedi_pts = gedi_img.addBands(ones).stratifiedSample({
    numPoints: 50000,  
    classBand: 'ones',
    //region: geometry,
    region: ukr.geometry(),
    scale: 25,
    tileScale: 16,
    seed: 42,
    geometries: true
  });
  
  
  var sampled = embeddings.reduceRegions({
    collection: gedi_pts,
    reducer: ee.Reducer.mean(),
    scale: 25,
    tileScale: 4
  });
  
  var sampled_clean = sampled.filter(
    ee.Filter.notNull(['A00', 'A01', 'agbd'])
  );
  
  
  print(sampled_clean.limit(5))
  
  Export.table.toDrive({
    collection: sampled_clean.map(function(f) {
      return f.set({
        'lon': f.geometry().coordinates().get(0),
        'lat': f.geometry().coordinates().get(1)
      }).setGeometry(null);
    }),
    description: 'agbd' + year,
    folder: 'agbd_samples',
    fileFormat: 'CSV'
  });
  }