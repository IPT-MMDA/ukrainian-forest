
# Harmonized Forest Ecosystem Dataset of Ukraine (2020–2025)

This repository contains Google Earth Engine scripts for processing GEDI lidar observations, sampling satellite embeddings, and generating forest structure maps for Ukraine. The code supports the development of a harmonized, multi-year dataset of forest ecosystem parameters for the period 2020–2025.

The workflow combines GEDI lidar measurements with Google AlphaEarth Foundations satellite embeddings and Random Forest regression to produce spatially continuous estimates of forest canopy cover, canopy height, and aboveground biomass density.

## Overview

The repository supports the generation of three forest structure products:

- **Canopy Cover (CC):** the percentage of ground covered by the vertical projection of tree crowns.
- **Relative Height (RH98):** the 98th percentile of the relative canopy height distribution derived from GEDI lidar observations.
- **Aboveground Biomass Density (AGBD):** the density of aboveground biomass, expressed in megagrams per hectare (Mg/ha).

The resulting annual maps cover Ukraine from 2020 to 2025 at a spatial resolution of 10 m. The workflow is designed to support forest ecosystem monitoring, forest structure assessment, carbon stock estimation, and the analysis of temporal changes in forest ecosystems.

## Repository Structure

### GEDI Data Sampling

These scripts retrieve and filter GEDI observations and extract corresponding satellite embedding features for model development.

| Script | Description |
|---|---|
| `GEDI_CC_EMD_download.js` | Samples GEDI canopy cover observations and corresponding satellite embeddings. |
| `GEDI_RH98_EMD_download.js` | Samples GEDI relative canopy height observations and corresponding satellite embeddings. |
| `GEDI_AGBD_EMD_download.js` | Samples GEDI aboveground biomass density observations and corresponding satellite embeddings. |

### Forest Parameter Mapping

These scripts implement the mapping workflow for the three forest parameters using satellite embeddings and regression models.

| Script | Description |
|---|---|
| `embCCmap.js` | Generates forest canopy cover maps. |
| `embRH98map.js` | Generates RH98 canopy height maps. |
| `embAGBDmap.js` | Generates aboveground biomass density maps. |

## Data Sources

The workflow uses the following Earth observation datasets and ancillary information:

- **NASA GEDI L2B:** reference observations of forest canopy cover.
- **NASA GEDI L2A:** reference observations for relative canopy height metrics, including RH98.
- **NASA GEDI L4A:** reference estimates of aboveground biomass density.
- **Google AlphaEarth Foundations embeddings:** 64-dimensional satellite embedding features at 10 m spatial resolution.
- **Forest cover masks:** used to constrain spatial prediction to forest and low woody vegetation areas.
- **Copernicus DEM GLO-30:** elevation data used to derive terrain slope for quality filtering.

GEDI observations are filtered using product-specific quality flags and additional criteria to reduce the influence of degraded measurements, low-quality retrievals, and unsuitable terrain conditions.

## Methodology

The workflow consists of the following main stages:

1. **GEDI data preparation.** GEDI observations are collected for the available reference years and filtered using quality indicators and terrain constraints.
2. **Satellite feature extraction.** AlphaEarth embedding features are sampled at GEDI observation locations.
3. **Regression modelling.** Separate Random Forest regression models are developed for canopy cover, RH98, and AGBD using observations from 2020, 2021, 2022, and 2024.
4. **Spatial prediction.** The trained models are applied to satellite embeddings to generate spatially continuous forest parameter maps for 2020–2025.
5. **Temporal harmonization and validation.** Annual products are harmonized to reduce artificial interannual differences while preserving meaningful forest changes, and their performance is evaluated using independent GEDI observations and available forest inventory data.

The 2023 and 2025 maps are generated using models trained on observations from other years because sufficient GEDI reference data were not available for representative training samples for those years.

## Requirements

The scripts are developed for the **Google Earth Engine (GEE) JavaScript API** and require:

- A Google account with access to Google Earth Engine.
- Access to the required GEDI and AlphaEarth embedding datasets.
- Access to the project-specific Earth Engine assets referenced in the scripts.
- Google Drive access for exporting sampled training data where required.

The mapping scripts also depend on the relevant input assets, forest masks, and intermediate datasets being available in the configured Earth Engine environment.

## Usage

### 1. Open Google Earth Engine

Open the [Google Earth Engine Code Editor](https://code.earthengine.google.com/) and sign in with an account that has access to the required datasets and project assets.

### 2. Obtain GEDI Samples

Run the appropriate sampling script for the target parameter:

- `GEDI_CC_EMD_download.js` for canopy cover.
- `GEDI_RH98_EMD_download.js` for relative canopy height.
- `GEDI_AGBD_EMD_download.js` for aboveground biomass density.

Review the quality filters, date ranges, study area, and export settings before running the scripts. The resulting samples are exported for subsequent model development.

### 3. Generate Forest Parameter Maps

Run the corresponding mapping script:

- `embCCmap.js` for canopy cover.
- `embRH98map.js` for RH98.
- `embAGBDmap.js` for AGBD.

Ensure that the required input assets and intermediate datasets are available and that any project-specific asset paths are configured correctly.

**Note:** The scripts may require adaptation to the user's Earth Engine project, asset permissions, and export configuration. The workflow depends on project-specific assets and is not necessarily executable in a new Earth Engine account without additional setup.

## Spatial and Temporal Coverage

- **Study area:** Ukraine.
- **Mapping period:** 2020–2025.
- **Spatial resolution:** 10 m.
- **Reference data:** GEDI observations from 2020, 2021, 2022, and 2024.
- **Output parameters:** Canopy Cover, RH98, and Aboveground Biomass Density.

The harmonized products are intended to provide a consistent basis for comparing forest structure across years. Users should distinguish changes in mapped forest parameters from changes in forest area and consider the limitations of GEDI observations in steep mountainous terrain.

## Data Access and Visualization

The annual raster products are described in the accompanying scientific study. The interactive Google Earth Engine application can be accessed here:

[Ukrainian Forest — Google Earth Engine App](https://ukrainian-forest.projects.earthengine.app/view/ukrainian-forest)

The application provides a way to explore the forest mapping products. Please refer to the associated data publication for information on the released raster files, their interpretation, and validation.

## Scientific Publication

If you use this code or the resulting products in your research, please cite the associated scientific publication.

1) Bohdan Yailymov, Hanna Yailymova, Oleh Chaskovskyy, Oleksandr Matushevskyi, Andrii Shelestov, Nataliia Kussul, Svitlana Nosok, Mykhailo Kolomytsev
 **Annual Tree Canopy Cover Mapping Using GEDI and Multi-Source Satellite Embeddings: A Case Study for Ukraine.** 16th International Conference Dependable Systems, Services and Technologies (DESSERT’2026), Greece, Corfu, October 2-4, 2026
2) Sofiia Drozd, Nataliia Kussul, Andrii Shelestov **Multi-Agent Framework for Scenario-Based Geospatial Modeling of Forest Biomass Dynamics under Natural and Anthropogenic Disturbances.** 16th International Conference Dependable Systems, Services and Technologies (DESSERT’2026), Greece, Corfu, October 2-4, 2026
3) Bohdan Yailymov, Hanna Yailymova, Nataliia Kussul **High-Resolution Tree Cover Density Mapping of Ukraine Using GEDI Lidar and Sentinel Imagery.** 2026 IEEE International Geoscience and Remote Sensing Symposium (IGARSS 2026), 9-14 August 2026, Washington DC, District of Columbia, USA

The full bibliographic reference and DOI should be added here once the publication details are finalized.

## Acknowledgements

The study was supported by 
1) the **HORIZON Europe** project FUTUREFOR №101180278 “Copernicus Applications for Next-Generation Forest Monitoring”,
2) **Ministry of Education and Science of Ukraine** projects (“Next-generation Copernicus services: an intelligent digital twin for forest cover analysis in Ukraine” (the Order of the Ministry of Education and Science of Ukraine dated 09.01.2026 № 23)), projects for young scientists “Machine learning methods with adaptive multimodal data fusion for cross-regional transfer of land cover classification models” and “State space models for environmental changes assessment” (the Order of the Ministry of Education and Science of Ukraine dated 09.01.2026 № 22),
3) **NASA** projects “Assessment Of The Impact Of War In Ukraine On National Protected Areas” (award number 80NSSC25K7652) and “Detecting and Mapping War-induced Damage to Agricultural Fields in Ukraine using Multi-Modal Remote Sensing Data” (award number: 80NSSC24K0354),
4) **NASU** project “Information technologies for monitoring changes in Ukraine's forest cover as a result of military operations using geospatial data”.

## License

No license information is specified in this README. Please consult the repository owner before reusing or redistributing the code until an explicit license has been added to the repository.
