#!/usr/bin/env python3
"""
Enrich web/data/geography.json with Historical Eras, Operational Tiers, and Legal Priorities.
"""

import json

HISTORICAL_META = {
    # Era 1 (1901–1915): Pre-Compact Ag & Salton Sea Trigger
    "gunnison": {
        "year": 1909,
        "era": "Era 1 (1901–1915): Pre-Compact Ag & Salton Sea Trigger",
        "tier": "Tier 3: Early Federal Reclamation Diversion",
        "legal_priority": "Senior 1901/1905 Uncompahgre Valley Decree",
        "historical_note": "Diverts Gunnison River through 5.8-mi mountain tunnel into Uncompahgre Valley. The 1905–1907 Salton Sea flood avulsion terrorized California and directly spurred the 1922 Compact and Hoover Dam authorization."
    },
    "grand valley": {
        "year": 1915,
        "era": "Era 1 (1901–1915): Pre-Compact Ag & Salton Sea Trigger",
        "tier": "Tier 3: Direct Gravity In-Basin Diversion",
        "legal_priority": "Senior 1902/1914 Present Perfected In-Basin Rights",
        "historical_note": "Roller dam at Cameo diverting Colorado River into Highline Canal. Part of early agricultural foundations that led to interstate water conflict."
    },
    "theodore roosevelt": {
        "year": 1911,
        "era": "Era 1 (1901–1915): Pre-Compact Ag & Salton Sea Trigger",
        "tier": "Tier 2: Salt River Project (SRP) Storage (1.65 MAF)",
        "legal_priority": "Senior 1903 Salt River Valley Water Users Rights",
        "historical_note": "First major Reclamation Act project, impounding the Salt River for Phoenix agriculture before Arizona joined the Colorado River Compact."
    },

    # Era 2 (1935–1943): Boulder Canyon Project Act / CA First Mover
    "hoover": {
        "year": 1935,
        "era": "Era 2 (1935–1943): Boulder Canyon Project Act / CA First Mover",
        "tier": "Tier 1: Lower Basin Megabank (26.13 MAF)",
        "legal_priority": "Senior Statutory Lower Basin Anchor (1928 Act)",
        "historical_note": "First mega-dam on the Colorado River. Impounds Lake Mead, controls lower river floods, and anchors Lower Basin water banking."
    },
    "stewart mountain": {
        "year": 1930,
        "era": "Era 2 (1935–1943): Boulder Canyon Project Act / CA First Mover",
        "tier": "Tier 2: Salt River Project (Saguaro Lake) Storage (69,765 AF)",
        "legal_priority": "SRP / Salt River Valley Water Users Association",
        "historical_note": "Impounds Saguaro Lake on the Salt River, re-regulating upstream discharges from Apache and Canyon lakes."
    },
    "moffat": {
        "year": 1936,
        "era": "Era 2 (1935–1943): Boulder Canyon Project Act / CA First Mover",
        "tier": "Tier 3: Trans-Mountain Collection & Export (1,280 cfs)",
        "legal_priority": "Senior 1921/1936 Denver Water Municipal Priority",
        "historical_note": "Pioneer bore of railroad tunnel repurposed to convey Fraser River collection system under Continental Divide to Gross Reservoir / Denver."
    },
    "taylor park": {
        "year": 1937,
        "era": "Era 2 (1935–1943): Boulder Canyon Project Act / CA First Mover",
        "tier": "Tier 3: Uncompahgre Project Upper Storage (106,200 AF)",
        "legal_priority": "Senior 1904/1937 Uncompahgre Valley Decree",
        "historical_note": "High mountain reservoir storing Gunnison headwaters for late-season release to the Gunnison Tunnel."
    },
    "parker": {
        "year": 1938,
        "era": "Era 2 (1935–1943): Boulder Canyon Project Act / CA First Mover",
        "tier": "Tier 4: Constant-Level Pumping Forebay (Lake Havasu)",
        "legal_priority": "Metropolitan Water District (MWD) & CA/AZ Municipal Priority",
        "historical_note": "Deepest dam foundation in the world (73% below riverbed). Impounds Lake Havasu as the constant-level pumping pool for both CRA (Los Angeles) and CAP (Phoenix)."
    },
    "imperial": {
        "year": 1938,
        "era": "Era 2 (1935–1943): Boulder Canyon Project Act / CA First Mover",
        "tier": "Tier 4: Diversion Dam & Desilting Works",
        "legal_priority": "Senior 1901 Present Perfected Rights Diversion",
        "historical_note": "Diverts up to 15,000 cfs into the All-American Canal and Gila Gravity Canal with giant radial desilting basins."
    },
    "bartlett": {
        "year": 1939,
        "era": "Era 2 (1935–1943): Boulder Canyon Project Act / CA First Mover",
        "tier": "Tier 2: Salt River Project (Verde River) Storage (178,000 AF)",
        "legal_priority": "SRP / Salt River Valley Water Users Association",
        "historical_note": "Multiple-arch dam on Verde River providing flood control and municipal/ag water for the Salt River Valley / Phoenix metro area."
    },
    "all-american": {
        "year": 1940,
        "era": "Era 2 (1935–1943): Boulder Canyon Project Act / CA First Mover",
        "tier": "Tier 3: Trans-Basin Agricultural Canal (11,500 cfs)",
        "legal_priority": "Senior 1901 Present Perfected Rights (3.1+ MAF/yr)",
        "historical_note": "80-mile canal conveying water entirely within US territory to Imperial and Coachella valleys. Holds the most senior, uncurtailable priority on the Lower Colorado River."
    },
    "headgate rock": {
        "year": 1941,
        "era": "Era 2 (1935–1943): Boulder Canyon Project Act / CA First Mover",
        "tier": "Tier 4: Indian Reservation Agricultural Diversion Dam",
        "legal_priority": "Senior 1865 Federal Reserved Tribal Water Rights",
        "historical_note": "Diverts Colorado River water directly into canals serving the Colorado River Indian Tribes reservation with priority dating to 1865."
    },
    "colorado river aqueduct": {
        "year": 1941,
        "era": "Era 2 (1935–1943): Boulder Canyon Project Act / CA First Mover",
        "tier": "Tier 3: Trans-Basin Municipal Aqueduct (1,600 cfs)",
        "legal_priority": "Priority 4 & 5 (Metropolitan Water District of SoCal)",
        "historical_note": "242-mile aqueduct lifting water 1,617 vertical feet over mountain ranges via 5 pumping plants to supply 19 million people in coastal Southern California."
    },
    "green mountain": {
        "year": 1943,
        "era": "Era 2 (1935–1943): Boulder Canyon Project Act / CA First Mover",
        "tier": "Tier 3: West Slope Compensatory Storage (153,600 AF)",
        "legal_priority": "Senate Document 80 Compensatory Mandate",
        "historical_note": "Built by Bureau of Reclamation on the Blue River exclusively to compensate Western Slope water users for upstream Colorado-Big Thompson exports."
    },

    # Era 3 (1947–1953): Mexican Treaty & C-BT Era
    "shadow mountain": {
        "year": 1946,
        "era": "Era 3 (1947–1953): Mexican Treaty & C-BT Era",
        "tier": "Tier 3: C-BT Collection & Pumping Forebay (18,400 AF)",
        "legal_priority": "Colorado-Big Thompson Project",
        "historical_note": "Connects with Grand Lake to maintain water levels for continuous gravity feeding into the Adams Tunnel intake."
    },
    "adams": {
        "year": 1947,
        "era": "Era 3 (1947–1953): Mexican Treaty & C-BT Era",
        "tier": "Tier 3: Trans-Mountain Collection & Export (1,020 cfs)",
        "legal_priority": "Northern Water / C-BT 1937 Priority",
        "historical_note": "13.1-mile tunnel beneath Rocky Mountain National Park delivering Colorado River headwaters to Estes Park, the Big Thompson River, and Front Range farms."
    },
    "granby": {
        "year": 1950,
        "era": "Era 3 (1947–1953): Mexican Treaty & C-BT Era",
        "tier": "Tier 3: Collection Forebay (Lake Granby, 539,800 AF)",
        "legal_priority": "Colorado-Big Thompson Project Storage",
        "historical_note": "Impounds Lake Granby, the primary storage reservoir of the C-BT project, from which water is pumped to Shadow Mountain Lake and Grand Lake into Adams Tunnel."
    },
    "morelos": {
        "year": 1950,
        "era": "Era 3 (1947–1953): Mexican Treaty & C-BT Era",
        "tier": "Tier 4: International Treaty Diversion Dam",
        "legal_priority": "1944 Mexican Water Treaty Sovereign Commitment (1.5 MAF/yr)",
        "historical_note": "International diversion structure near Los Algodones diverting Mexico's guaranteed 1.5 MAF treaty water into the Reforma Canal for the Mexicali Valley."
    },
    "davis": {
        "year": 1951,
        "era": "Era 3 (1947–1953): Mexican Treaty & C-BT Era",
        "tier": "Tier 4: Hourly Hydropower Re-regulation & Treaty Forebay",
        "legal_priority": "Lower Basin Re-regulation (1944 Treaty Compliance)",
        "historical_note": "Impounds Lake Mohave to re-regulate peaking power releases from Hoover Dam into uniform deliveries satisfying downstream contract and Mexican Treaty demands."
    },
    "williams fork": {
        "year": 1959,
        "era": "Era 3 (1947–1953): Mexican Treaty & C-BT Era",
        "tier": "Tier 3: Denver Water Compensatory Storage (96,822 AF)",
        "legal_priority": "Denver Water Western Slope Exchange Agreement",
        "historical_note": "Denver Water exchange reservoir on Williams Fork tributary used to release replacement water downstream so Moffat Tunnel can divert headwaters upstream."
    },

    # Era 4 (1962–1972): CRSP Act / Upper Basin Escrow Bank
    "roberts": {
        "year": 1962,
        "era": "Era 4 (1962–1972): CRSP Act / Upper Basin Escrow Bank",
        "tier": "Tier 3: Trans-Mountain Municipal Diversion (1,020 cfs)",
        "legal_priority": "Senior 1946 Denver Water Municipal Priority",
        "historical_note": "23.3-mile trans-mountain tunnel conveying Blue River water from Dillon Reservoir beneath Continental Divide to the South Platte Basin."
    },
    "navajo": {
        "year": 1962,
        "era": "Era 4 (1962–1972): CRSP Act / Upper Basin Escrow Bank",
        "tier": "Tier 2: CRSP Initial Unit Backup Storage (1.70 MAF)",
        "legal_priority": "Colorado River Storage Project (CRSP 1956 Act)",
        "historical_note": "Major CRSP storage unit on the San Juan River supplying Navajo Indian Irrigation Project, San Juan-Chama diversion, and downstream endangered fish flows."
    },
    "dillon": {
        "year": 1963,
        "era": "Era 4 (1962–1972): CRSP Act / Upper Basin Escrow Bank",
        "tier": "Tier 3: Collection Forebay (Dillon Reservoir, 257,114 AF)",
        "legal_priority": "Denver Water Largest Storage Facility",
        "historical_note": "Impounds Blue River at Silverthorne; Denver Water's primary storage reservoir diverting water through Roberts Tunnel to Front Range taps."
    },
    "glen canyon": {
        "year": 1963,
        "era": "Era 4 (1962–1972): CRSP Act / Upper Basin Escrow Bank",
        "tier": "Tier 1: Upper Basin Escrow Bank (24.32 MAF)",
        "legal_priority": "CRSP Keystone Facility (1956 Act / 1922 Compact Delivery)",
        "historical_note": "The Upper Basin's 'insurance policy'. Impounds Lake Powell 15 miles upstream of Lees Ferry to guarantee the 75 MAF 10-year rolling compact release to the Lower Basin."
    },
    "flaming gorge": {
        "year": 1964,
        "era": "Era 4 (1962–1972): CRSP Act / Upper Basin Escrow Bank",
        "tier": "Tier 2: CRSP Initial Unit Backup Storage (3.79 MAF)",
        "legal_priority": "CRSP Storage & Drought Response Operations",
        "historical_note": "Largest storage unit in the Green River sub-basin; subject to DROA emergency releases to protect Lake Powell minimum power pool elevations."
    },
    "fontenelle": {
        "year": 1964,
        "era": "Era 4 (1962–1972): CRSP Act / Upper Basin Escrow Bank",
        "tier": "Tier 2: CRSP Seedskadee Unit Storage (345,360 AF)",
        "legal_priority": "CRSP Participating Project (1956 Act)",
        "historical_note": "Impounds Upper Green River near La Barge, WY to supply Seedskadee National Wildlife Refuge, municipal trona mining, and Upper Basin storage."
    },
    "blue mesa": {
        "year": 1966,
        "era": "Era 4 (1962–1972): CRSP Act / Upper Basin Escrow Bank",
        "tier": "Tier 2: CRSP Aspinall Unit Backup Storage (829,500 AF)",
        "legal_priority": "CRSP Storage & Drought Response Operations",
        "historical_note": "Keystone unit of the Wayne N. Aspinall Unit on the Gunnison River; largest body of water in Colorado."
    },
    "homestake": {
        "year": 1967,
        "era": "Era 4 (1962–1972): CRSP Act / Upper Basin Escrow Bank",
        "tier": "Tier 3: Trans-Mountain Collection (43,600 AF)",
        "legal_priority": "Aurora & Colorado Springs Municipal Partnership",
        "historical_note": "High-altitude collection system in Eagle County tunneling water to Arkansas River and across South Park to Aurora and Colorado Springs."
    },
    "ruedi": {
        "year": 1968,
        "era": "Era 4 (1962–1972): CRSP Act / Upper Basin Escrow Bank",
        "tier": "Tier 3: West Slope Compensatory Storage (102,374 AF)",
        "legal_priority": "Fryingpan-Arkansas Project Act (1962)",
        "historical_note": "Impounds Ruedi Reservoir on Fryingpan River to compensate Western Slope water users for headwaters diverted eastward through Boustead Tunnel."
    },
    "morrow point": {
        "year": 1968,
        "era": "Era 4 (1962–1972): CRSP Act / Upper Basin Escrow Bank",
        "tier": "Tier 2: CRSP Aspinall Unit Hydro Peaking (117,190 AF)",
        "legal_priority": "CRSP Storage & Wayne N. Aspinall Unit",
        "historical_note": "Thin-arch concrete dam in the Black Canyon of the Gunnison; houses Colorado's first underground hydroelectric power plant."
    },
    "palo verde": {
        "year": 1968,
        "era": "Era 4 (1962–1972): CRSP Act / Upper Basin Escrow Bank",
        "tier": "Tier 4: Run-of-the-River Agricultural Diversion Dam",
        "legal_priority": "Senior 1877 Present Perfected Rights (First Lower Basin Priority)",
        "historical_note": "Diverts Colorado River streamflow into the Palo Verde Canal serving 131,000 acres in the Blythe agricultural valley with the most senior non-tribal priority in California."
    },
    "boustead": {
        "year": 1972,
        "era": "Era 4 (1962–1972): CRSP Act / Upper Basin Escrow Bank",
        "tier": "Tier 3: Trans-Mountain Collection & Export (945 cfs)",
        "legal_priority": "Fryingpan-Arkansas Project (1962 Act)",
        "historical_note": "5.4-mile tunnel carrying Fryingpan and Roaring Fork headwaters beneath the Continental Divide to Turquoise Lake / Arkansas Basin."
    },
    "crystal": {
        "year": 1976,
        "era": "Era 4 (1962–1972): CRSP Act / Upper Basin Escrow Bank",
        "tier": "Tier 4: Aspinall Unit Re-regulation Forebay (26,000 AF)",
        "legal_priority": "CRSP Wayne N. Aspinall Unit Re-regulation",
        "historical_note": "Downstream re-regulation dam in the Gunnison River gorge buffering peaking hydropower surges from Blue Mesa and Morrow Point dams."
    },

    # Era 5 (1985–1993): Junior Lower Basin Straw & Modern Upgrades
    "mcphee": {
        "year": 1984,
        "era": "Era 5 (1985–1993): Junior Lower Basin Straw & Modern Upgrades",
        "tier": "Tier 3: Dolores Project Storage (381,100 AF)",
        "legal_priority": "Dolores Project / Ute Mountain Ute Tribal Water Rights",
        "historical_note": "Impounds Dolores River to provide agricultural irrigation to Montezuma Valley and satisfy Ute Mountain Ute Indian Tribe water rights compact settlement."
    },
    "central arizona": {
        "year": 1985,
        "era": "Era 5 (1985–1993): Junior Lower Basin Straw & Modern Upgrades",
        "tier": "Tier 3: Trans-Basin Canal (3,000 cfs, 336 Miles)",
        "legal_priority": "Junior 1968 Priority (Subordinated to California 4.4 MAF)",
        "historical_note": "336-mile canal lifting water 2,900 vertical feet to Phoenix and Tucson. In exchange for federal construction authorization, Arizona accepted that CAP is legally junior to California, absorbing the first mandatory shortage cuts under Lake Mead restrictions."
    },
    "windy gap": {
        "year": 1985,
        "era": "Era 5 (1985–1993): Junior Lower Basin Straw & Modern Upgrades",
        "tier": "Tier 3: Trans-Mountain Pumping Diversion",
        "legal_priority": "Junior 1967 Northern Water / Municipal Priority",
        "historical_note": "Pumping diversion below Granby diverting Colorado River and Fraser River runoff into Lake Granby for delivery through Adams Tunnel."
    },
    "wolford mountain": {
        "year": 1995,
        "era": "Era 5 (1985–1993): Junior Lower Basin Straw & Modern Upgrades",
        "tier": "Tier 3: Colorado River District Compensatory Storage (65,985 AF)",
        "legal_priority": "Colorado River District Water Management",
        "historical_note": "Muddy Creek reservoir constructed to provide drought mitigation, endangered fish recovery water, and West Slope replacement storage."
    }
}

with open("web/data/geography.json", "r") as f:
    geo = json.load(f)

# Enrich dams
for d in geo.get("dams", []):
    name_lower = d.get("name", "").lower()
    for k, meta in HISTORICAL_META.items():
        if k in name_lower:
            d["era"] = meta["era"]
            d["tier"] = meta["tier"]
            d["legal_priority"] = meta["legal_priority"]
            d["historical_note"] = meta["historical_note"]
            if meta.get("year"):
                d["year"] = meta["year"]
            break

# Enrich tunnels
for t in geo.get("tunnels", []):
    name_lower = t.get("name", "").lower()
    for k, meta in HISTORICAL_META.items():
        if k in name_lower:
            t["era"] = meta["era"]
            t["tier"] = meta["tier"]
            t["legal_priority"] = meta["legal_priority"]
            t["historical_note"] = meta["historical_note"]
            if meta.get("year"):
                t["year"] = meta["year"]
            break

with open("web/data/geography.json", "w") as f:
    json.dump(geo, f, indent=2)

print("Updated web/data/geography.json with comprehensive historical metadata!")
