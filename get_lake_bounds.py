import geopandas as gpd
lakes = gpd.read_file("web/data/lakes.geojson")
print(lakes[['name', 'geometry']])
