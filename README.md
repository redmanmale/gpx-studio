This is my fork of the [original gpx.studio](https://github.com/gpxstudio/gpxstudio.github.io) which was deprecated in 2024.

## Run the code

To play with the code locally:
1. Launch a local server in the root directory, for example using `http-server -p 8000`
1. *(Optional)* To test the software with your own routing server:
    - download [BRouter](https://github.com/abrensch/brouter) and follow the instructions [here](https://github.com/abrensch/brouter#brouter-on-windowslinuxmac-os) on how to launch a local instance
    - change the URL of the routing server in `res/config.json`

## Main features

* Load, edit and create new GPX files
* Support for multiple tracks (`<trk>`) and track segments (`<trkseg>`): extraction with smart waypoints matching and merge as track segments
* Support for waypoints (`<wpt>`): place and drag, edit information, duplicate
* Support for files with timestamps, temperature, heartrate, cadence and power data
* Change the starting time and speed of the activity
* Reverse the direction of a trace
* Reduce the number of track points
* Merge multiple traces together
* Delete points and/or waypoints inside or outside a rectangle selection
* View and rework the structure of the file
* Export multiple traces as one or separately in the chosen order and respecting time precedence constraints (if any time data)
* Drag and drop to load and export files
* Support as many traces as you want with scrollable tabs
* Support for custom map layers

## Acknowledgements

This project would not have been possible without the following amazing projects:
* [Leaflet](https://leafletjs.com/): awesome map library
* [leaflet-gpx](https://github.com/mpetazzoni/leaflet-gpx): parsing GPX files
* [Leaflet.Heightgraph](https://github.com/GIScience/Leaflet.Heightgraph): elevation profile
* [Leaflet.Icon.Glyph](https://github.com/Leaflet/Leaflet.Icon.Glyph): markers with icons for the waypoints
* [Leaflet.TextPath](https://github.com/makinacorpus/Leaflet.TextPath): direction markers
* [Leaflet.VectorGrid](https://github.com/Leaflet/Leaflet.VectorGrid): to display some vector tiles
* [leaflet-distance-markers](https://github.com/adoroszlai/leaflet-distance-markers): distance markers
* [leaflet-control-window](https://github.com/mapshakers/leaflet-control-window): centered windows for all dialogs
* [leaflet-control-geocoder](https://github.com/perliedman/leaflet-control-geocoder): search for locations with chosen API
* [leaflet-locatecontrol](https://github.com/domoritz/leaflet-locatecontrol): center the map on user location
* [leaflet-overpass-layer](https://github.com/GuillaumeAmat/leaflet-overpass-layer): get POI from Overpass API
* [tilebelt](https://github.com/mapbox/tilebelt): find correct tiles to request and access elevation data
* [PNG.js](https://github.com/arian/pngjs): read raw PNG data to decode elevation from [Mapbox Terrain-RGB tiles](https://docs.mapbox.com/help/troubleshooting/access-elevation-data/#mapbox-terrain-rgb)
* [simplify2](https://github.com/geonome/simplify2-js): line simplification algorithm
* [js-xss](https://github.com/leizongmin/js-xss): HTML sanitizer for waypoint text fields
* [SortableJS](https://github.com/SortableJS/Sortable): for swapping the tabs
* [Font Awesome](https://fontawesome.com/): nice icons

And of course [OpenStreetMap](https://www.openstreetmap.org/) for the worldwide map data on which are based most of the map layers and the routing server.
