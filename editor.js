$(document).ready(function () {
    $("form")[0] && $("form")[0].reset();
    var map = null,
        imageOverlayUrl = '',
        shapeObjects = [],
        editableLayers = null,
        lineThickness = 2,
        imageBoundCoordinate = null,
        drawControl = null,
        aspectRatio = false,
        previousImageURL = '';
    L.LatLng.prototype.distanceTo = function (currentPostion) {
        var dx = currentPostion.lng - this.lng;
        var dy = currentPostion.lat - this.lat;
        return Math.sqrt(dx * dx + dy * dy);
    };
    function imageOverlayChange(image) {
        if (!image) {
            return;
        }
        imageOverlayUrl = image;
        editableLayers = null;
        initlayer();
    }
    var debouncedInitLayer = _.debounce(imageOverlayChange, 1000);
    $('#imageurl').on('input propertychange paste', function () {
        debouncedInitLayer($(this).val());
    });
    $('#fileinput').on('input change propertychange', function () {
        $('.fileName').html(_.last(this.value.split("\\")));
        var reader = new FileReader();
        reader.readAsDataURL(this.files[0]);
        reader.onload = function () {
            previousImageURL = this.result;
            debouncedInitLayer(this.result);
        };
    });
    $('#fileType').on("change", function () {
        var selectedOption = $(this).val();
        $('.upload, .urlimage').removeClass('hide');
        $('.' + selectedOption).addClass('hide');
        if (selectedOption === "upload") {
            debouncedInitLayer($('#imageurl').val());
        } else {
            debouncedInitLayer(previousImageURL);
        }
    });
    $('#fitwindow').on('click', function () {
        aspectRatio = this.checked;
        if (editableLayers) {
            var layers = editableLayers._layers;
            _.each(layers, function (shape) {
                transform(shape, "/", imageBoundCoordinate);
            });
        }
        initlayer();
    });

    function download(filename, text) {
        var isIE = /*@cc_on!@*/false || !!document.documentMode;

        // Edge 20+
        var isEdge = !isIE && !!window.StyleMedia;
        if (isIE || isEdge) {
            var blobObject = new Blob([text]);
            window.navigator.msSaveBlob(blobObject, filename);
        } else {
            var element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
            element.setAttribute('download', filename);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }
    }
    function transform(layer, operation, imageBoundCoordinate) {
        if (layer._latlngs) {
            var LatLng = [];
            if (layer.options.layerType === "polyline") {
                LatLng = layer._latlngs;
            } else {
                LatLng = layer._latlngs[0];
            }
            _.each(LatLng, function (latlng) {
                if (operation === "*") {
                    latlng.lat = latlng.lat * imageBoundCoordinate[0];
                    latlng.lng = latlng.lng * imageBoundCoordinate[1];
                } else {
                    latlng.lat = latlng.lat / imageBoundCoordinate[0];
                    latlng.lng = latlng.lng / imageBoundCoordinate[1];
                }
            });
        } else if (layer._latlng) {
            if (operation === "*") {
                layer._latlng.lat = layer._latlng.lat * imageBoundCoordinate[0];
                layer._latlng.lng = layer._latlng.lng * imageBoundCoordinate[1];
                var area = layer._mRadius * (imageBoundCoordinate[0] * imageBoundCoordinate[1]);
                layer._mRadius = Math.sqrt(area / Math.PI);
            } else {
                layer._latlng.lat = layer._latlng.lat / imageBoundCoordinate[0];
                layer._latlng.lng = layer._latlng.lng / imageBoundCoordinate[1];
                layer._mRadius = Math.PI * layer._mRadius * layer._mRadius / (imageBoundCoordinate[0] * imageBoundCoordinate[1]);
            }
        }
    };

    function save() {
        shapeObjects = [];
        var layers = _.cloneDeep(editableLayers._layers)
        _.each(layers, function (shape) {
            transform(shape, "/", imageBoundCoordinate);
            if (shape.options.layerType === 'circle' || shape.options.layerType === 'marker') {
                shapeObjects.push({
                    name: shape.options.layerType,
                    shapeName: shape.shapeName,
                    dimension: '',
                    options: shape.options,
                    _latlng: shape._latlng,
                    _mRadius: shape._mRadius
                });
            }
            else {
                shapeObjects.push({
                    name: shape.options.layerType,
                    shapeName: shape.shapeName,
                    dimension: '',
                    options: shape.options,
                    _latlngs: shape._latlngs
                });
            }
        });
        download('geojson.json', JSON.stringify(shapeObjects));
    }
    function addEditors(layers) {
        editableLayers = layers;
        map.addLayer(editableLayers);
        var drawPluginOptions = {
            position: 'topright',
            draw: {
                polyline: {
                    shapeOptions: {
                        color: 'rgb(51, 136, 255)',
                        weight: lineThickness,
                        name: 'polyline'
                    }
                },
                polygon: {
                    allowIntersection: false, // Restricts shapes to simple polygons
                    drawError: {
                        color: '#e1e100', // Color the shape will turn when intersects
                        message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
                    },
                    shapeOptions: {
                        weight: lineThickness,
                        color: 'rgb(51, 136, 255)',
                        name: 'polygon'
                    }
                },
                marker: {
                    icon: L.SCNDesignStudioMarkers.icon({})
                },
                circlemarker: false,
                circle: {
                    shapeOptions: {
                        weight: lineThickness,
                        color: 'rgb(51, 136, 255)',
                        name: 'circle'
                    }
                },
                rectangle: {
                    shapeOptions: {
                        weight: lineThickness,
                        clickable: false,
                        color: 'rgb(51, 136, 255)',
                        name: "rectangle"
                    }
                },
            },
            edit: {
                featureGroup: editableLayers, //REQUIRED!!
                remove: true
            },
            delete: {
                featureGroup: editableLayers, //REQUIRED!!                    
            }
        };
        drawControl = new L.Control.Draw(drawPluginOptions);
        map.addControl(drawControl);
        map.on('click', function () {
            window.currentTooltip && window.currentTooltip.closeTooltip();
            window.currentTooltip = null;
        });
        map.on('draw:created', function (e) {
            var type = e.layerType,
                layer = e.layer;
            layer.options["layerType"] = type;
            layer.on('contextmenu', function (e) {
                $('.contextmenu-name').remove();
                window.currentTooltip && window.currentTooltip.closeTooltip();
                window.layer = this;
                window.currentTooltip = this.bindTooltip('<div class= "contextmenu-name" onmousedown="event.stopPropagation();" onmouseup="event.stopPropagation();" onclick="event.stopPropagation();" style="pointer-events:all;z-index:10000;"><input type="text" id="content" placeholder="\t\tType a Name" onkeypress="if(event.keyCode === 13)window.addName(event,layer)" style="background: white;border: 1px double #DDD;border-radius: 5px;box-shadow: 0 0 5px #333;color: #666;outline: none;height:25px;width: 200px;"/><button style="background: #3498db;border-radius: 60px;padding: 9px;" onClick="window.addName(event,layer)"><i class="fa fa-check"></i></button>', { permanent: true });
            });
            editableLayers.addLayer(layer);
        });
    }
    function addControls() {
        var thickness = L.Control.extend({
            options: {
                position: 'topright'
            },
            onAdd: function (map) {
                var tooltip = L.DomUtil.create('a')
                tooltip.title = 'Line Thickness';
                var lineThicknessContainer = L.DomUtil.create('input');
                lineThicknessContainer.type = 'text';
                lineThicknessContainer.style['text-align'] = 'center';
                lineThicknessContainer.style.width = '30px';
                lineThicknessContainer.style.height = '30px';
                lineThicknessContainer.value = lineThickness;
                $(lineThicknessContainer).on('input propertychange paste', function () {
                    lineThickness = $(this).val();
                    drawControl.remove();
                    addEditors(editableLayers);
                });
                tooltip.appendChild(lineThicknessContainer);
                var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                container.appendChild(tooltip);
                container.style.backgroundColor = 'white';
                container.style.backgroundSize = "30px 30px";
                return container;
            }
        });
        var customControl = L.Control.extend({
            options: {
                position: 'topleft'
            },
            onAdd: function (map) {
                var saveContainer = L.DomUtil.create('a');
                saveContainer.href = '#';
                saveContainer.title = 'Save Layer';
                saveContainer.innerHTML = '<i style="font-size:15px;margin-top:8px;" class="fa fa-download" aria-hidden="true"></i>';
                saveContainer.onclick = function () {
                    save();
                }
                var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                container.appendChild(saveContainer);
                container.style.backgroundColor = 'white';
                container.style.backgroundSize = "30px 30px";
                return container;
            }
        });
        map.addControl(new thickness());
        map.addControl(new customControl());
    }
    window.addName = function (event, layer) {
        window.currentTooltip && window.currentTooltip.closeTooltip();
        window.currentTooltip = null;
        let name = $('#content').val();
        layer.shapeName = name;
        name && layer.bindTooltip(name, { permanent: true });
        $('.contextmenu-name').remove();
    };
    function initMap(imageBound) {
        if (map) {
            map.remove();
        }
        map = L.map('map', {
            crs: L.CRS.Simple,
            minZoom: -2,
            maxZoom: 10,
        });
        imageBoundCoordinate = imageBound;
        var bounds = [
            imageBound,
            [0, 0]
        ];
        var image = L.imageOverlay(imageOverlayUrl, bounds, {
            'ZIndex': -2
        }).addTo(map);
        map.fitBounds(bounds);
        map.doubleClickZoom.disable();
        addControls();
    }

    function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
        var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
        return { width: srcWidth * ratio, height: srcHeight * ratio };
    };

    function initlayer() {
        if (!imageOverlayUrl) {
            $('.smokeScreen').find('#message').html('Please select a Image.');
            $('.smokeScreen').show();
            return;
            // imageOverlayUrl = 'http://www.lib.utexas.edu/maps/historical/newark_nj_1922.jpg';
        }
        var sourceImage = $("<img />").css({ 'display': 'none' }).attr("src", imageOverlayUrl);
        $('.smokeScreen').find('#message').html('<i class="fa fa-spinner fa-spin" style="font-size:24px"></i>');
        $('.smokeScreen').show();
        sourceImage.on("load", function () {
            $('.smokeScreen').hide();
            var imageBound = [];
            if (aspectRatio) {
                imageBound = calculateAspectRatioFit(this.naturalWidth, this.naturalHeight, $("#map").width(), $("#map").height());
                imageBound = [imageBound.height, imageBound.width];
            } else {
                imageBound = [this.naturalHeight, this.naturalWidth];
            }
            initMap(imageBound);
            if (editableLayers) {
                var layers = editableLayers._layers;
                _.each(layers, function (shape) {
                    transform(shape, "*", imageBound);
                });
                addEditors(editableLayers);
            } else {
                addEditors(new L.FeatureGroup());
            }
            $('.leaflet-container').css({
                background: 'rgba(128,128,128,0.7)'
            });
        });
        sourceImage.on("error", function () {
            $('.smokeScreen').find('#message').html('Fail to load the image');
        });
    }
    initlayer();
});
