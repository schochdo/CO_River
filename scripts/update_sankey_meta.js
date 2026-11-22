const fs = require("fs");
let html = fs.readFileSync("web/sankey.html", "utf8");

const newMeta = `
      // --- Tier 2: Storage Reservoirs & Pools ---
      "Lake Powell Pool (Glen Canyon Dam)": {
        cleanTitle: "Lake Powell Pool (Glen Canyon Dam)",
        summary: "Glen Canyon Dam regulatory pool (24.3 MAF capacity). Buffers Upper Basin inflows to guarantee 7.50+ MAF Compact delivery at Lees Ferry.",
        stationId: "lake_powell",
        stationLabel: "USBR Lake Powell",
        portalUrl: "https://www.usbr.gov/uc/water/crsp/cs/gcd.html",
        flowCfs: 8420,
        pctMean: "101%"
      },
      "Lake Mead Pool (Hoover Dam Hub)": {
        cleanTitle: "Lake Mead Pool (Hoover Dam Hub)",
        summary: "Hoover Dam mainstem reservoir (26.1 MAF capacity). Controls Lower Basin releases to California, Arizona, Nevada, Mexico, and system evaporation.",
        stationId: "lake_mead",
        stationLabel: "USBR Lake Mead",
        portalUrl: "https://www.usbr.gov/lc/region/g4000/hourly/mead-elv.html",
        flowCfs: 9150,
        pctMean: "98%"
      },
      "Lower Basin Tributaries (Virgin & Little CO)": {
        cleanTitle: "Lower Basin Tributaries (Virgin & Little CO)",
        summary: "Tributaries entering below Lees Ferry (Virgin River, Little Colorado River, Bill Williams River) providing ~0.45 MAF natural inflow to Lake Mead.",
        stationId: "09415000",
        stationLabel: "USGS #09415000 (Virgin River)",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09415000/#parameterCode=00060",
        flowCfs: 280,
        pctMean: "95%"
      },
      "System Losses & Conveyance": {
        cleanTitle: "System Losses & Conveyance",
        summary: "Atmospheric evaporation from Lake Mead and Lake Powell water surfaces (~0.90 MAF) plus riparian evapotranspiration and channel seepage (~0.50 MAF).",
        stationId: "lake_powell",
        stationLabel: "USBR LC Operations",
        portalUrl: "https://www.usbr.gov/lc/region/g4000/riverops/hourly7.html",
        flowCfs: null,
        pctMean: null
      },

      // --- Tier 5: State-Disaggregated End Uses ---
      "Colorado Western Slope Ag": {
        cleanTitle: "Colorado Western Slope Agriculture",
        summary: "Senior irrigation diversions for orchards, alfalfa, and cattle ranching in Grand Valley, Uncompahgre, and Gunnison basins (~79% of CO use).",
        stationId: "09095500",
        stationLabel: "USGS #09095500 (Cameo)",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09095500/#parameterCode=00060",
        flowCfs: 1850,
        pctMean: "94%"
      },
      "Front Range Municipal (CO)": {
        cleanTitle: "Front Range Municipalities (Denver/CO Springs)",
        summary: "Denver Water, Aurora, and Colorado Springs trans-mountain exports under Continental Divide via Roberts, Moffat, Adams, and Boustead tunnels (~21% of CO use).",
        stationId: "ROBTUNCO",
        stationLabel: "CDSS #ROBTUNCO",
        portalUrl: "https://dwr.state.co.us/Tools/Stations?station=ROBTUNCO",
        flowCfs: 410,
        pctMean: "85%"
      },
      "Utah Uinta Basin Ag": {
        cleanTitle: "Utah Uinta & Green River Agriculture",
        summary: "Direct agricultural diversions supporting irrigated pasture and forage crops across eastern Utah (~88% of UT use).",
        stationId: "09315000",
        stationLabel: "USGS #09315000 (Green River, UT)",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09315000/#parameterCode=00060",
        flowCfs: 1200,
        pctMean: "90%"
      },
      "Wasatch Front Municipal (UT)": {
        cleanTitle: "Wasatch Front Cities (Salt Lake/Provo)",
        summary: "Central Utah Project (CUP) and Strawberry Valley trans-basin deliveries to Salt Lake City and Utah County urban corridor (~12% of UT use).",
        stationId: "09315000",
        stationLabel: "Central Utah WCD",
        portalUrl: "https://waterrights.utah.gov/",
        flowCfs: null,
        pctMean: null
      },
      "Wyoming Upper Green Ag": {
        cleanTitle: "Wyoming Upper Green River Agriculture",
        summary: "Native hay meadow irrigation and cattle ranching in Sublette and Sweetwater counties (~100% of WY use).",
        stationId: "09211200",
        stationLabel: "USGS #09211200",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09211200/#parameterCode=00060",
        flowCfs: 540,
        pctMean: "91%"
      },
      "New Mexico San Juan Ag": {
        cleanTitle: "New Mexico San Juan & NAPI Agriculture",
        summary: "Navajo Indian Irrigation Project (NIIP), Hogback, and Fruitland canals plus San Juan-Chama trans-basin exports (~100% of NM use).",
        stationId: "09368000",
        stationLabel: "USGS #09368000 (Shiprock)",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09368000/#parameterCode=00060",
        flowCfs: 680,
        pctMean: "93%"
      },
      "California Imperial & Coachella Ag": {
        cleanTitle: "California Imperial & Coachella Agriculture",
        summary: "Senior 1901 Present Perfected Rights irrigating ~500,000 acres of winter vegetable and alfalfa crops via All-American Canal (~77% of CA use).",
        stationId: "09527700",
        stationLabel: "USGS #09527700 (Imperial Valley)",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09527700/#parameterCode=00060",
        flowCfs: 2850,
        pctMean: "96%"
      },
      "Arizona Mainstem River Ag": {
        cleanTitle: "Arizona Mainstem River Agriculture",
        summary: "Senior run-of-the-river irrigation producing ~90% of US winter leafy greens in Yuma, Wellton-Mohawk, and Parker (~52% of AZ use).",
        stationId: "USBR-PARKER",
        stationLabel: "USBR Parker Dam Operations",
        portalUrl: "https://www.usbr.gov/lc/region/g4000/riverops/hourly7.html",
        flowCfs: 1620,
        pctMean: "94%"
      },
      "Central Arizona Ag & Tribal (CAP)": {
        cleanTitle: "Central Arizona Ag & Tribal (CAP)",
        summary: "Pinal County agricultural irrigation and Gila River / Tohono O'odham tribal settlement water conveyed via CAP canal (~16% of AZ use).",
        stationId: "09426650",
        stationLabel: "CAP Pinal Reach",
        portalUrl: "https://www.cap-az.com/",
        flowCfs: null,
        pctMean: null
      },
      "Central Arizona Municipal (Phoenix/Tucson)": {
        cleanTitle: "Central Arizona Municipal (Phoenix & Tucson)",
        summary: "Drinking water for 5+ million residents in Maricopa, Pinal, and Pima counties lifted 2,900 ft via Central Arizona Project aqueduct (~32% of AZ use).",
        stationId: "09426650",
        stationLabel: "USGS #09426650 (CAP Mark Wilmer)",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09426650/#parameterCode=00060",
        flowCfs: 1450,
        pctMean: "92%"
      },
      "Baja California Municipal (Tijuana/Mexicali)": {
        cleanTitle: "Baja California Cities (Tijuana & Mexicali)",
        summary: "Drinking water pumped via the Rio Colorado-Tijuana Aqueduct across the Sierra de Juarez to 2+ million residents (~17% of Mexico use).",
        stationId: "09522000",
        stationLabel: "Morelos Dam Municipal Take",
        portalUrl: "https://www.ibwc.gov/",
        flowCfs: null,
        pctMean: null
      },
`;

html = html.replace("const NODE_META = {", "const NODE_META = {" + newMeta);
fs.writeFileSync("web/sankey.html", html);
console.log("Updated NODE_META successfully!");
