const fs = require('fs');

let html = fs.readFileSync('web/sankey.html', 'utf8');

// Replace the node definition and links in web/sankey.html
// 1. In NODE_META:
// Add entries for "Colorado Front Range Tunnels" and "Utah Wasatch Tunnels (CUP)"
const oldMetaAnchor = '"Trans-Mountain Diversion Tunnels": {';
const newMetaEntries = `"Colorado Front Range Tunnels": {
        cleanTitle: "Front Range Tunnels (CO)",
        summary: "Adams Tunnel, Roberts Tunnel, Moffat Tunnel, and Boustead Tunnel conveying West Slope Colorado River water across the Continental Divide to Denver, Colorado Springs, and Fort Collins.",
        stationId: "ROBTUNCO",
        stationLabel: "CDSS #ROBTUNCO",
        portalUrl: "https://dwr.state.co.us/Tools/Stations?station=ROBTUNCO",
        flowCfs: 410,
        pctMean: "85%"
      },
      "Utah Wasatch Tunnels (CUP)": {
        cleanTitle: "Wasatch Front Tunnels (UT / CUP)",
        summary: "Strawberry Valley and Central Utah Project (CUP) tunnels conveying Green River tributary water across the Wasatch Range to Salt Lake City and Utah Valley.",
        stationId: "09315000",
        stationLabel: "Central Utah WCD",
        portalUrl: "https://waterrights.utah.gov/",
        flowCfs: 140,
        pctMean: "90%"
      },
      "Trans-Mountain Diversion Tunnels": {`;

html = html.replace(oldMetaAnchor, newMetaEntries);

// 2. In renderSankey nodes:
html = html.replace(
  '{ name: "Trans-Mountain Diversion Tunnels", category: "municipal", basin: "upper", desc: "Continental Divide exports to Front Range & Wasatch" },',
  '{ name: "Colorado Front Range Tunnels", category: "municipal", basin: "upper", desc: "Adams, Moffat, Roberts, Boustead tunnels across Continental Divide" },\n        { name: "Utah Wasatch Tunnels (CUP)", category: "municipal", basin: "upper", desc: "Strawberry Valley & Central Utah Project trans-basin diversions" },'
);

// 3. In renderSankey links:
const oldLinks = `{ source: "Upper Basin In-Basin Allocations", target: "Western Slope Gravity Canals", value: 3.90, category: "ag" },
        { source: "Upper Basin In-Basin Allocations", target: "Trans-Mountain Diversion Tunnels", value: 0.60, category: "municipal" },`;

const newLinks = `{ source: "Upper Basin In-Basin Allocations", target: "Western Slope Gravity Canals", value: 3.90, category: "ag" },
        { source: "Upper Basin In-Basin Allocations", target: "Colorado Front Range Tunnels", value: 0.48, category: "municipal" },
        { source: "Upper Basin In-Basin Allocations", target: "Utah Wasatch Tunnels (CUP)", value: 0.12, category: "municipal" },`;

html = html.replace(oldLinks, newLinks);

const oldTunnelToStates = `{ source: "Trans-Mountain Diversion Tunnels", target: "State of Colorado", value: 0.48, category: "municipal" },
        { source: "Trans-Mountain Diversion Tunnels", target: "State of Utah", value: 0.12, category: "municipal" },`;

const newTunnelToStates = `{ source: "Colorado Front Range Tunnels", target: "State of Colorado", value: 0.48, category: "municipal" },
        { source: "Utah Wasatch Tunnels (CUP)", target: "State of Utah", value: 0.12, category: "municipal" },`;

html = html.replace(oldTunnelToStates, newTunnelToStates);

fs.writeFileSync('web/sankey.html', html);
console.log('Applied separate tunnels successfully!');
