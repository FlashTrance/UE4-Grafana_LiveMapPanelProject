// A GRAFANA PLUGIN USING THE LEAFLET LIBRARY TO DISPLAY A MAP PANEL IN THE GRAFANA DASHBOARD
// ----------------------------------------------------------------------

System.register(["./leaflet/leaflet.js", "moment", "app/core/app_events", "app/plugins/sdk", "./leaflet/leaflet.css!", "./partials/module.css!", "@grafana/runtime"], function (_export, _context) 
{
  "use strict";

  // Global class objects
  var L, moment, runtime, appEvents, MetricsPanelCtrl, TrackMapCtrl;

  // Grafana Plugin required functions
  function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }
  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }
  function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }
  function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
  function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
  function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }
  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
  
  // function log(msg) { console.log(msg); } // Uncomment and use log() for debugging

  return {
    setters:
    [ 
      function (_leafletLeafletJs) { L = _leafletLeafletJs.default; }, 
      function (_moment) { moment = _moment.default; }, 
      function (_appCoreApp_events) { appEvents = _appCoreApp_events.default; }, 
      function (_appPluginsSdk) { MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl; },
      function (_leafletLeafletCss) {}, 
      function (_partialsModuleCss) {},
      function (_grafanaRuntime) { runtime = _grafanaRuntime.default; }
    ],
    execute: function () 
    {
      _export("TrackMapCtrl", TrackMapCtrl = function (_MetricsPanelCtrl) {
        _inherits(TrackMapCtrl, _MetricsPanelCtrl);

        function TrackMapCtrl($scope, $injector) 
        {
          var _this;
          _classCallCheck(this, TrackMapCtrl);
          _this = _possibleConstructorReturn(this, _getPrototypeOf(TrackMapCtrl).call(this, $scope, $injector));

          // Default panel values  (these are what shows up in the "Options" section for the panel)
          _.defaults(_this.panel, {
            maxDataPoints: 500,
            autoZoom: true,
            scrollWheelZoom: false,
            defaultLayer: 'OpenStreetMap',
            showLayerChanger: true,
            lineColor: 'yellow',
            pointColor: 'royalblue',
            defaultSymbol: 'Arrows'
          }); 

          // Map Layers
          _this.layers = {
            'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
              maxZoom: 19
            }),
            'OpenTopoMap': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
              attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
              maxZoom: 17
            })
          };

          // Symbol types
          _this.symbols = {'Arrows': 'arrow', 'Marker': 'marker'};

          // Event Icons
          // Event types from Sim: "TrafficLight", "Incident", "Break", "TrafficJam"
          _this.eventIcons = {'TrafficLight': 'https://i.imgur.com/ZWcy466.png',
                            'Incident': 'https://dejpknyizje2n.cloudfront.net/marketplace/products/police-badge-vector-icon-sticker-1539809476.4618473.png',
                            'Break': 'https://freeiconshop.com/wp-content/uploads/edd/burger-outline-filled.png',
                            'TrafficJam': 'https://static.thenounproject.com/png/383752-200.png',
                            'EndShift': 'https://freeiconshop.com/wp-content/uploads/edd/burger-outline-filled.png',
                            'OfficerMarker': 'https://i.imgur.com/kexQZzm.png'};

          // Other global variables
          _this.timeSrv = $injector.get('timeSrv');
          _this.coords = [];
          _this.icons = [];
          _this.vehicleIDs = new Set();
          _this.officerData = {};
          _this.leafMap = null;
          _this.layerChanger = null;
          _this.mainPolyline = null;
          _this.polylines = {};
          _this.decorators = {};
          _this.marker = null;
          _this.hoverMarker = null;
          _this.hoverTarget = null;
          _this.setSizePromise = null; // Panel events

          // Grafana Plugin API Event function bindings
          _this.events.on('panel-initialized', _this.onInitialized.bind(_assertThisInitialized(_this)));
          _this.events.on('view-mode-changed', _this.onViewModeChanged.bind(_assertThisInitialized(_this)));
          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_assertThisInitialized(_this)));
          _this.events.on('panel-teardown', _this.onPanelTeardown.bind(_assertThisInitialized(_this)));
          _this.events.on('panel-size-changed', _this.onPanelSizeChanged.bind(_assertThisInitialized(_this)));
          _this.events.on('data-received', _this.onDataReceived.bind(_assertThisInitialized(_this)));
          _this.events.on('data-snapshot-load', _this.onDataSnapshotLoad.bind(_assertThisInitialized(_this)));
          _this.events.on('render', _this.onRender.bind(_assertThisInitialized(_this))); // Global events

          appEvents.on('graph-hover', _this.onPanelHover.bind(_assertThisInitialized(_this)));
          appEvents.on('graph-hover-clear', _this.onPanelClear.bind(_assertThisInitialized(_this)));


          ////////////////////////
          // DECORATOR LIBRARY  //
          ////////////////////////

          // MATH, COORDINATE CALCULATIONS, ETC. //
          function pointDistance(ptA, ptB) 
          {
            const x = ptB.x - ptA.x;
            const y = ptB.y - ptA.y;
            return Math.sqrt(x * x + y * y);
          }
          
          const computeSegmentHeading = (a, b) =>
              ((Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI) + 90 + 360) % 360;

          const asRatioToPathLength = ({ value, isInPixels }, totalPathLength) =>
            isInPixels ? value / totalPathLength : value;

          const pointsEqual = (a, b) => a.x === b.x && a.y === b.y;

          function pointsToSegments(pts) 
          {
            return pts.reduce((segments, b, idx, points) => 
            {
                // This test skips same adjacent points
                if (idx > 0 && !pointsEqual(b, points[idx - 1])) 
                {
                    const a = points[idx - 1];
                    const distA = segments.length > 0 ? segments[segments.length - 1].distB : 0;
                    const distAB = pointDistance(a, b);
                    segments.push({
                        a,
                        b,
                        distA,
                        distB: distA + distAB,
                        heading: computeSegmentHeading(a, b),
                    });
                }
                return segments;
            }, []);
          }

          function interpolateBetweenPoints(ptA, ptB, ratio) 
          {
            if (ptB.x !== ptA.x) 
            {
                return {
                    x: ptA.x + ratio * (ptB.x - ptA.x),
                    y: ptA.y + ratio * (ptB.y - ptA.y),
                };
            }
            // Special case where points lie on the same vertical axis
            return {
                x: ptA.x,
                y: ptA.y + (ptB.y - ptA.y) * ratio,
            };
          }

          const isCoord = c =>
            (c instanceof L.LatLng) ||
            (Array.isArray(c) && c.length === 2 && typeof c[0] === 'number');
          const isCoordArray = ll => Array.isArray(ll) && isCoord(ll[0]);

          function projectPatternOnPointPath(pts, pattern) 
          {
            // 1. Split the path into segment infos
            const segments = pointsToSegments(pts);
            const nbSegments = segments.length;
            if (nbSegments === 0) { return []; }

            const totalPathLength = segments[nbSegments - 1].distB;
        
            const offset = asRatioToPathLength(pattern.offset, totalPathLength);
            const endOffset = asRatioToPathLength(pattern.endOffset, totalPathLength);
            const repeat = asRatioToPathLength(pattern.repeat, totalPathLength);
        
            const repeatIntervalPixels = totalPathLength * repeat;
            const startOffsetPixels = offset > 0 ? totalPathLength * offset : 0;
            const endOffsetPixels = endOffset > 0 ? totalPathLength * endOffset : 0;
        
            // 2. Generate the positions of the pattern as offsets from the path start
            const positionOffsets = [];
            let positionOffset = startOffsetPixels;
            do {
                positionOffsets.push(positionOffset);
                positionOffset += repeatIntervalPixels;
            } while (repeatIntervalPixels > 0 && positionOffset < totalPathLength - endOffsetPixels);
        
            // 3. Projects offsets to segments
            let segmentIndex = 0;
            let segment = segments[0];

            return positionOffsets.map(positionOffset => {
                // find the segment matching the offset,
                // starting from the previous one as offsets are ordered
                while (positionOffset > segment.distB && segmentIndex < nbSegments - 1) 
                {
                    segmentIndex++;
                    segment = segments[segmentIndex];
                }
        
                const segmentRatio = (positionOffset - segment.distA) / (segment.distB - segment.distA);
                return {
                    pt: interpolateBetweenPoints(segment.a, segment.b, segmentRatio),
                    heading: segment.heading,
                };
            });
        }

        function parseRelativeOrAbsoluteValue(value) 
        {
          if (typeof value === 'string' && value.indexOf('%') !== -1) 
          {
            return {
                value: parseFloat(value) / 100,
                isInPixels: false,
            };
          }
          const parsedValue = value ? parseFloat(value) : 0;
          return {
              value: parsedValue,
              isInPixels: parsedValue > 0,
          };
        }

        // SYMBOL DEFINITIONS //
        L.Symbol = L.Symbol || {};

        // DASH
        // Note: Can also be used for dots, if 'pixelSize' option is given the 0 value.
        L.Symbol.Dash = L.Class.extend({
          options: {
              pixelSize: 10,
              pathOptions: { }
          },

          initialize: function (options) 
          {
            L.Util.setOptions(this, options);
            this.options.pathOptions.clickable = false;
          },

          buildSymbol: function(dirPoint, latLngs, map, index, total) 
          {
            const opts = this.options;
            const d2r = Math.PI / 180;

            // For a dot, nothing more to compute
            if (opts.pixelSize <= 1) 
            {
                return L.polyline([dirPoint.latLng, dirPoint.latLng], opts.pathOptions);
            }

            const midPoint = map.project(dirPoint.latLng);
            const angle = (-(dirPoint.heading - 90)) * d2r;
            const a = L.point(
                midPoint.x + opts.pixelSize * Math.cos(angle + Math.PI) / 2,
                midPoint.y + opts.pixelSize * Math.sin(angle) / 2
            );

            // Compute second point by central symmetry to avoid unecessary cos/sin
            const b = midPoint.add(midPoint.subtract(a));
            return L.polyline([map.unproject(a), map.unproject(b)], opts.pathOptions);
          }
        });
        L.Symbol.dash = function (options) { return new L.Symbol.Dash(options); };

        // ARROW HEAD
        L.Symbol.ArrowHead = L.Class.extend({
            options: {
                polygon: true,
                pixelSize: 10,
                headAngle: 60,
                pathOptions: {
                    stroke: false,
                    weight: 2
                }
            },

            initialize: function (options) {
                L.Util.setOptions(this, options);
                this.options.pathOptions.clickable = false;
            },

            buildSymbol: function(dirPoint, latLngs, map, index, total) {
                return this.options.polygon
                    ? L.polygon(this._buildArrowPath(dirPoint, map), this.options.pathOptions)
                    : L.polyline(this._buildArrowPath(dirPoint, map), this.options.pathOptions);
            },

            _buildArrowPath: function (dirPoint, map) {
                const d2r = Math.PI / 180;
                const tipPoint = map.project(dirPoint.latLng);
                const direction = (-(dirPoint.heading - 90)) * d2r;
                const radianArrowAngle = this.options.headAngle / 2 * d2r;

                const headAngle1 = direction + radianArrowAngle;
                const headAngle2 = direction - radianArrowAngle;
                const arrowHead1 = L.point(
                    tipPoint.x - this.options.pixelSize * Math.cos(headAngle1),
                    tipPoint.y + this.options.pixelSize * Math.sin(headAngle1));
                const arrowHead2 = L.point(
                    tipPoint.x - this.options.pixelSize * Math.cos(headAngle2),
                    tipPoint.y + this.options.pixelSize * Math.sin(headAngle2));

                return [
                    map.unproject(arrowHead1),
                    dirPoint.latLng,
                    map.unproject(arrowHead2)
                ];
            }
        });
        L.Symbol.arrowHead = function (options) { return new L.Symbol.ArrowHead(options); };

        // MARKER
        L.Symbol.Marker = L.Class.extend({
            options: {
                markerOptions: { },
                rotate: false
            },

            initialize: function (options) {
                L.Util.setOptions(this, options);
                this.options.markerOptions.clickable = false;
                this.options.markerOptions.draggable = false;
            },

            buildSymbol: function(directionPoint, latLngs, map, index, total) {
                if(this.options.rotate) {
                    this.options.markerOptions.rotationAngle = directionPoint.heading + (this.options.angleCorrection || 0);
                }
                return L.marker(directionPoint.latLng, this.options.markerOptions);
            }
        });
        L.Symbol.marker = function (options) { return new L.Symbol.Marker(options); };

          L.PolylineDecorator = L.FeatureGroup.extend({
            options: {
                patterns: []
            },
        
            initialize: function(paths, options) {
              L.FeatureGroup.prototype.initialize.call(this);
              L.Util.setOptions(this, options);
              this._map = null;
              this._paths = this._initPaths(paths);
              this._bounds = this._initBounds();
              this._patterns = this._initPatterns(this.options.patterns);
            },
        
            // Deals with all the different cases. Input can be one of these types:
            // Array of LatLng, array of 2-number arrays, Polyline, Polygon, array of one of the previous.
            _initPaths: function(input, isPolygon) 
            {
              if (isCoordArray(input)) 
              {
                  const coords = isPolygon ? input.concat([input[0]]) : input; // Leaflet Polygons don't need the first point to be repeated, but we do
                  return [coords];
              }
              if (input instanceof L.Polyline) { return this._initPaths(input.getLatLngs(), (input instanceof L.Polygon)); }
              if (Array.isArray(input)) 
              {
                  // Flatten everything, we just need coordinate lists to apply patterns
                  return input.reduce((flatArray, p) =>
                      flatArray.concat(this._initPaths(p, isPolygon)),
                  []);
              }
              return [];
            },
        
            // Parse pattern definitions and precompute some values
            _initPatterns: function(patternDefs) { return patternDefs.map(this._parsePatternDef); },
        
            // Changes the patterns used by this decorator and redraws the new one.
            setPatterns: function(patterns) 
            {
                this.options.patterns = patterns;
                this._patterns = this._initPatterns(this.options.patterns);
                this.redraw();
            },

            setPaths: function(paths) 
            {
                this._paths = this._initPaths(paths);
                this._bounds = this._initBounds();
                this.redraw();
            },
        
            // Parse the pattern definition
            _parsePatternDef: function(patternDef, latLngs) 
            {
                return {
                    symbolFactory: patternDef.symbol,
                    // Parse offset and repeat values, managing the two cases:
                    // absolute (in pixels) or relative (in percentage of the polyline length)
                    offset: parseRelativeOrAbsoluteValue(patternDef.offset),
                    endOffset: parseRelativeOrAbsoluteValue(patternDef.endOffset),
                    repeat: parseRelativeOrAbsoluteValue(patternDef.repeat),
                };
            },
        
            onAdd: function (map) 
            {
                this._map = map;
                this._draw();
                this._map.on('moveend', this.redraw, this);
            },
        
            onRemove: function (map) 
            {
                this._map.off('moveend', this.redraw, this);
                this._map = null;
                L.FeatureGroup.prototype.onRemove.call(this, map);
            },
        
            // As real pattern bounds depends on map zoom and bounds, we just compute the total bounds of all paths decorated by this instance.
            _initBounds: function() 
            {
                const allPathCoords = this._paths.reduce((acc, path) => acc.concat(path), []);
                return L.latLngBounds(allPathCoords);
            },
            getBounds: function() { return this._bounds; },
        
            // Returns an array of ILayers object
            _buildSymbols: function(latLngs, symbolFactory, directionPoints) 
            {
                return directionPoints.map((directionPoint, i) =>
                    symbolFactory.buildSymbol(directionPoint, latLngs, this._map, i, directionPoints.length)
                );
            },
        
            //Compute pairs of LatLng and heading angle, that define positions and directions of the symbols on the path
            _getDirectionPoints: function(latLngs, pattern) 
            {
              if (latLngs.length < 2) { return []; }
              const pathAsPoints = latLngs.map(latLng => this._map.project(latLng));
              return projectPatternOnPointPath(pathAsPoints, pattern)
                  .map(point => ({
                      latLng: this._map.unproject(L.point(point.pt)),
                      heading: point.heading,
                  }));
            },
        
            redraw: function() 
            {
              if (!this._map) { return; }
              this.clearLayers();
              this._draw();
            },
        
            // Returns all symbols for a given pattern as an array of FeatureGroup
            _getPatternLayers: function(pattern) 
            {
              const mapBounds = this._map.getBounds().pad(0.1);
              return this._paths.map(path => {
                  const directionPoints = this._getDirectionPoints(path, pattern)
                    .filter(point => mapBounds.contains(point.latLng)); // filter out invisible points
                  return L.featureGroup(this._buildSymbols(path, pattern.symbolFactory, directionPoints));
              });
            },
        
            // Draw all patterns
            _draw: function () 
            {
              this._patterns
                .map(pattern => this._getPatternLayers(pattern))
                .forEach(layers => { this.addLayer(L.featureGroup(layers)); });
            }
        });

        // Allows compact syntax to be used
        L.polylineDecorator = function (paths, options) { return new L.PolylineDecorator(paths, options); };

        ///////////////////////////
        // END DECORATOR LIBRARY //
        ///////////////////////////

          return _this;
        }



        // TRACK MAP CLASS //
        _createClass(TrackMapCtrl, [

        {
          key: "onRender",
          value: function onRender() 
          {
            var _this2 = this;

            // Wait until there is at least one GridLayer with fully loaded tiles before calling renderingCompleted
            if (this.leafMap) 
            {
              this.leafMap.eachLayer( function (l) 
              {
                if (l instanceof L.GridLayer) 
                {
                  if (l.isLoading()) { l.once('load', _this2.renderingCompleted.bind(_this2)); } 
                  else { _this2.renderingCompleted(); }
                }
              });
            }
          }
        }, 

        {
          key: "onInitialized",
          value: function onInitialized() { this.render(); }
        }, 

        {
          key: "onInitEditMode",
          value: function onInitEditMode() { this.addEditorTab('Options', 'public/plugins/ktlas-trackmap-panel/partials/options.html', 2); }
        }, 

        {
          key: "onPanelTeardown",
          value: function onPanelTeardown() { this.$timeout.cancel(this.setSizePromise); }
        },

        {
          key: "onPanelHover",
          value: function onPanelHover(event) 
          {
            // Check if we are already showing the correct hoverMarker
            if (this.coords.length === 0) { return; } 

            // Check for initial show of the marker
            var target = Math.floor(event.pos.x);
            if (this.hoverTarget && this.hoverTarget === target) { return; } 
            if (this.hoverTarget == null) { this.hoverMarker.addTo(this.leafMap); }

            // Find the currently selected time and move the hoverMarker to it. 
            // Note that an exact match isn't always going to work due to rounding.
            this.hoverTarget = target; 

            var min = 0;
            var max = this.coords.length - 1;
            var idx = null;
            var exact = false;

            while (min <= max) 
            {
              idx = Math.floor((max + min) / 2);

              if (this.coords[idx].allData.timestamp === this.hoverTarget) 
              {
                exact = true;
                break;
              } 
              else if (this.coords[idx].allData.timestamp < this.hoverTarget) { min = idx + 1; } 
              else { max = idx - 1; } 
            } 

            // Correct the case where we are +1 index off
            if (!exact && idx > 0 && this.coords[idx].allData.timestamp > this.hoverTarget) { idx--; }

            this.hoverMarker.setLatLng(this.coords[idx].allData.position);
            this.render();
          }
        }, 

        {
          key: "onPanelClear",
          value: function onPanelClear(event) 
          {
            // Clear markers from map
            this.hoverTarget = null;
            if (this.hoverMarker) { this.hoverMarker.removeFrom(this.leafMap); }
            if (this.marker) { this.marker.removeFrom(this.leafMap); }
          }
        }, 

        {
          key: "onViewModeChanged",
          value: function onViewModeChanged() 
          {
            // When the view mode is changed, panel resize events are not emitted even if the panel was resized. 
            // Work around this by telling the panel it's been resized whenever the view mode changes.
            this.onPanelSizeChanged();
          }
        }, 

        {
          key: "onPanelSizeChanged",
          value: function onPanelSizeChanged() 
          {
            // This event is fired too soon - we need to delay doing the actual size invalidation until 
            // after the panel has actually been resized.
            this.$timeout.cancel(this.setSizePromise);

            var map = this.leafMap;
            this.setSizePromise = this.$timeout( function () 
            {
              if (map) { map.invalidateSize(true); }
            }, 500);
          }
        }, 

        {
          key: "applyScrollZoom",
          value: function applyScrollZoom() 
          {
            var enabled = this.leafMap.scrollWheelZoom.enabled();

            if (enabled != this.panel.scrollWheelZoom) 
            {
              if (enabled) { this.leafMap.scrollWheelZoom.disable(); } 
              else         { this.leafMap.scrollWheelZoom.enable(); }
            }
          }
        }, 

        {
          key: "applyDefaultLayer",
          value: function applyDefaultLayer() 
          {
            var _this3 = this;

            var hadMap = Boolean(this.leafMap);
            this.setupMap();

            if (hadMap) 
            {
              // Re-add the default layer
              this.leafMap.eachLayer(function (layer) { layer.removeFrom(_this3.leafMap); });
              this.layers[this.panel.defaultLayer].addTo(this.leafMap); 
              
              // Hide/show the layer switcher
              this.leafMap.removeControl(this.layerChanger);
              if (this.panel.showLayerChanger) { this.leafMap.addControl(this.layerChanger); }
            }

            this.addDataToMap();
          }
        }, 

        {
          key: "setupMap",
          value: function setupMap() {
            
            // Create the map or get it back in a clean state if it already exists
            if (this.leafMap) 
            {
              this.vehicleIDs.forEach( (id) => 
              {
                if (this.polylines.hasOwnProperty(id)) { this.polylines[id].removeFrom(this.leafMap); }
                if (this.decorators.hasOwnProperty(id)) { this.decorators[id].removeFrom(this.leafMap); }
              });

              if (this.icons.length > 0) { this.icons.forEach( (elem) => {elem.marker.removeFrom(this.leafMap); } )}

              this.onPanelClear();
              return;
            } 
            
            // Create the map
            this.leafMap = L.map('trackmap-' + this.panel.id, {
              scrollWheelZoom: this.panel.scrollWheelZoom,
              zoomSnap: 0.5,
              zoomDelta: 1
            }); 
            
            // Create the layer changer
            this.layerChanger = L.control.layers(this.layers); 
            
            // Add layers to the control widget
            if (this.panel.showLayerChanger) {
              this.leafMap.addControl(this.layerChanger);
            } 
            
            // Add default layer to map
            this.layers[this.panel.defaultLayer].addTo(this.leafMap); 
            
            // Hover marker
            this.hoverMarker = L.circleMarker(L.latLng(0, 0), {
              color: 'white',
              fillColor: this.panel.pointColor,
              fillOpacity: 1,
              weight: 2,
              radius: 7
            }); 
            
            // Events
            this.leafMap.on('baselayerchange', this.mapBaseLayerChange.bind(this));
            this.leafMap.on('boxzoomend', this.mapZoomToBox.bind(this));
          }
        }, 

        {
          key: "mapBaseLayerChange",
          value: function mapBaseLayerChange(e) 
          {
            // If a tileLayer has a 'forcedOverlay' attribute, always enable/disable it along with the layer
            if (this.leafMap.forcedOverlay) 
            {
              this.leafMap.forcedOverlay.removeFrom(this.leafMap);
              this.leafMap.forcedOverlay = null;
            }

            var overlay = e.layer.options.forcedOverlay;
            if (overlay) 
            {
              overlay.addTo(this.leafMap);
              overlay.setZIndex(e.layer.options.zIndex + 1);
              this.leafMap.forcedOverlay = overlay;
            }
          }
        }, 

        {
          key: "mapZoomToBox",
          value: function mapZoomToBox(e) 
          {
            // Find time bounds of selected coordinates
            var bounds = this.coords.allData.reduce( function (t, c) 
            {
              if (e.boxZoomBounds.contains(c.position)) 
              {
                t.from = Math.min(t.from, c.timestamp);
                t.to = Math.max(t.to, c.timestamp);
              }

              return t;
            }, 
            {
              from: Infinity,
              to: -Infinity
            }); 

            if (isFinite(bounds.from) && isFinite(bounds.to)) 
            {
              // Create moment objects here to avoid a TypeError that occurs when Grafana processes normal numbers
              this.timeSrv.setTime({ from: moment.utc(bounds.from), to: moment.utc(bounds.to) });
            }

            // Add the circles and polyline to the map
            this.render();
          } 
        }, 

        {
          key: "addDataToMap",
          value: function addDataToMap() 
          {
            // Retrieve selected Vehicle ID values from Grafana dashboard
            let select_id_array = runtime.getTemplateSrv().getVariables()[0].current.text;
            if (select_id_array[0] == "All") 
            { 
              select_id_array = [];
              let options_array = runtime.getTemplateSrv().getVariables()[0].options.slice(1);
              options_array.forEach( (elem) => { select_id_array.push(elem.text); })
            }

            // Add map elements (polylines, markers, etc.) based on the user-selected Vehicle IDs in the dashboard
            let allPoints = [];
            select_id_array.forEach( (id) => 
            {
              // Filter out lat/long points based on vehicle ID
              let points = this.coords.map(function (x) { if (x.hasOwnProperty(id)) { allPoints.push(x.allData.position); return x.allData.position;} });
              points = points.filter(x => x !== undefined);

              // POLYLINE
              this.polylines[id] = L.polyline(points, this, 
              {
                color: this.panel.lineColor,
                weight: 3
              }).addTo(this.leafMap);
              this.polylines[id].setStyle({color: this.panel.lineColor});

              // DECORATOR - ARROW
              if (this.symbols[this.panel.defaultSymbol] == "arrow")
              {
                this.decorators[id] = L.polylineDecorator(this.polylines[id], { patterns: [ 
                    { offset: '100%', repeat: 0, symbol: L.Symbol.arrowHead( {pixelSize: 15, polygon: false, pathOptions: {color: this.panel.pointColor, stroke: true} } )} 
                  ]
                }).addTo(this.leafMap);
              }

              // DECORATOR - MARKER ICON
              else if (this.symbols[this.panel.defaultSymbol] == "marker")
              {
                // Setup vehicle icons
                var decIcon = L.icon({
                  iconUrl: this.eventIcons.OfficerMarker,
                  iconSize: [40, 40],
                  popupAnchor: [3, -20],
                  title: id
                });

                // Create marker popup that will be bound to this icon
                var popup = L.popup({ autoClose: false, closeOnClick: true, autoPan: true });
                
                // Setup the popup content
                var html_content = "Vehicle ID: " + id
                                    + "<br>Speed: " + this.officerData[id].vehicleSpeed + " mph"
                                    + "<br>Distance Traveled: " + this.officerData[id].distanceTraveled + " mi"
                                    + "<br>Time Worked: " + this.officerData[id].timeWorked + " min";
                popup.setContent("<p>" + html_content + "</p>");

                // Create vehicle marker and bind popup to it
                this.decorators[id] = L.polylineDecorator(this.polylines[id], { patterns: [ 
                    { offset:'100%', repeat: false, symbol: L.Symbol.marker( { markerOptions: { icon: decIcon } } )} 
                  ]
                }).bindPopup(popup).addTo(this.leafMap);
              }

              // MAP EVENT MARKERS
              if (this.icons.length > 0)
              {
                this.icons.forEach( (elem) => { if (elem.vehicleID == id) { elem.marker.addTo(this.leafMap); } });
              }  
            });

            // MAIN POLYLINE - For use in zoomToFit function. This polyline is not added to the map.
            this.mainPolyline = L.polyline(allPoints, this, {});
            this.zoomToFit();
          }
        }, 

        {
          key: "zoomToFit",
          value: function zoomToFit() 
          {
            // Zoom map to fit the bounds of the main polyline
            if (this.panel.autoZoom && this.mainPolyline) 
            {
              var bounds = this.mainPolyline.getBounds();

              if (bounds.isValid()) { this.leafMap.fitBounds(bounds); } 
              else                  { this.leafMap.setView([0, 0], 1); }
            }

            this.render();
          }
        }, 

        {
          key: "refreshColors",
          value: function refreshColors() 
          {
            this.vehicleIDs.forEach( (id) => 
            {
              // Set colors for map elements based on settings in options panel
              if (this.polylines.hasOwnProperty(id)) { this.polylines[id].setStyle({color: this.panel.lineColor}); }
              if (this.hoverMarker) { this.hoverMarker.setStyle({fillColor: this.panel.pointColor}); }
              if (this.decorators.hasOwnProperty(id)) { this.decorators[id].setStyle({color: this.panel.pointColor}); }
            });

            this.render();
          }
        }, 

        {
          key: "onDataReceived",
          value: function onDataReceived(data) 
          {
            this.setupMap();

            // Check whether there's any data to display, if not just clear map and return
            if (data[0].datapoints == undefined) 
            { 
              this.leafMap.setView([0, 0], 1);
              this.render();
              return;
            } 

            // GET DATA FROM GRAFANA QUERY
            this.coords.length = 0;
            this.icons.length = 0;
            var lats = data[0].datapoints;
            var lons = data[1].datapoints;
            var sqlData = data[2].rows;

            // SQL data index reference: 1 = eventtype, 2 = eventdescription, 3 = poi, 4 = vehicleid, 5 = vehiclespeed, 6 = distancetraveled, 
            // 7 = totaltimeworked, 8 = city, 9 = street, 10 = speedlimit 

            // STORE DATA IN GLOBAL VARIABLES
            for (var i = 0; i < lats.length; i++) 
            {
              if (lats[i][0] == null || lons[i][0] == null || lats[i][1] !== lons[i][1]) { continue; }

              // Add unique vehicle IDs to Set
              let vehicleID = sqlData[i][4];
              this.vehicleIDs.add(vehicleID);

              // Populate officer data
              this.officerData[vehicleID] = { vehicleSpeed: sqlData[i][5], distanceTraveled: sqlData[i][6], timeWorked: sqlData[i][7] };

              // Push lats and lons for Polyline to a hashmap with a key for each individual vehicle ID
              // Note: The "allData" key is used for the "mainPolyline" object
              this.coords.push({
                [vehicleID]: {
                  position: L.latLng(lats[i][0], lons[i][0]),
                  timestamp: lats[i][1]
                },
                allData: {
                  position: L.latLng(lats[i][0], lons[i][0]),
                  timestamp: lats[i][1]
                }
              });

              // Push valid marker data to array (along with the data we want to display in the popup)
              if (sqlData[i][1].toString('utf-8').trim().length > 0)
              {
                this.icons.push({
                  eventID: sqlData[i][1].toString('utf-8'),
                  eventDescription: sqlData[i][2].toString('utf-8'),
                  vehicleID: sqlData[i][4].toString('utf-8'),
                  city: sqlData[i][8].toString('utf-8'),
                  street: sqlData[i][9].toString('utf-8'),
                  position: [lats[i][0], lons[i][0]],
                  marker: L.marker()
                });
              }
            }

            // DISPLAY MARKERS
            if (this.icons.length > 0)
            {
              this.icons.forEach( (elem) => 
              { 
                // Get icon URL
                var eventIconUrl = "";
                eventIconUrl = this.eventIcons[elem.eventID];
  
                // Setup Leaflet marker icon
                var eventIcon = L.icon({
                  iconUrl: eventIconUrl,
                  iconSize: [30, 30],
                  iconAnchor: [12, 25],
                  popupAnchor: [-3, -60],
                });

                // Create marker popup that will be bound to this icon
                var popup = L.popup({ autoClose: false, closeOnClick: true, autoPan: true });
                
                // Setup the popup content
                var html_content = "Event Type: " + elem.eventID 
                                    + "<br>Vehicle ID: " + elem.vehicleID
                                    + "<br>City: " + elem.city
                                    + "<br>Street Name: " + elem.street
                                    + "<br>Lat/Long: " + elem.position[0] + ", " + elem.position[1];
                popup.setContent("<p>" + html_content + "</p>");
    
                // Store marker reference and bind the popup to it
                elem.marker = L.marker(elem.position, { icon: eventIcon });
                elem.marker.bindPopup(popup);
              });
            }

            this.addDataToMap();
          }
        }, 

        {
          key: "onDataSnapshotLoad",
          value: function onDataSnapshotLoad(snapshotData) { this.onDataReceived(snapshotData); }
        }
      ]);

        return TrackMapCtrl;
      } (MetricsPanelCtrl));

      TrackMapCtrl.templateUrl = 'partials/module.html';
    }
  };
});
//# sourceMappingURL=trackmap_ctrl.js.map
