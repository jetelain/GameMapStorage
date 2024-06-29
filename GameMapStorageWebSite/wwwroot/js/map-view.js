
function updateLayerLinks(map) {
    const box = map.getBounds();
    const newQuery = `?x=${Math.round(box.getWest())}&y=${Math.round(box.getSouth())}&w=${Math.round(box.getEast() - box.getWest())}&h=${Math.round(box.getNorth() - box.getSouth())}`;

    document.querySelectorAll(".layer-link").forEach(layerLink => {
        const href = layerLink.getAttribute("href");
        const search = href.indexOf('?');
        if (search != -1) {
            layerLink.setAttribute("href", href.substring(0, search) + newQuery);
        }
        else {
            layerLink.setAttribute("href", href + newQuery);
        }
    });
}

function mapInit(mapInfos) {

    var map = GameMapUtils.basicInit(mapInfos);

    map.on('zoomend moveend', function () {
        updateLayerLinks(map);
    });

    updateLayerLinks(map);

    let lastMeasure;

    GameMapUtils.buttonGroupBlock().add(

        GameMapUtils.handToolButton(),

        GameMapUtils.measurePathToolButton()
            .on('added', ev => { lastMeasure = ev.marker; })
            .on('started', ev => { if (lastMeasure) { lastMeasure.remove(); lastMeasure = null; } })

    ).addTo(map);

    GameMapUtils.buttonGroupBlock().add(
        GameMapUtils.rulerToolButton(),
        GameMapUtils.coordinateScaleToolButton(),
        GameMapUtils.protractorToolButton()
    ).addTo(map);

    document.querySelectorAll(".location-link").forEach(element => {
        element.addEventListener("click", event => {
            event.stopPropagation();
            event.preventDefault();
            map.setView([
                Number(element.getAttribute("data-location-y")),
                Number(element.getAttribute("data-location-x"))
            ], mapInfos.maxZoom);
        });
    });

    document.getElementById("locations-search").addEventListener("input", function () {
        var value = this.value.toLowerCase();
        document.querySelectorAll(".location-link").forEach(element => {
            if (element.getAttribute("data-location-name").toLowerCase().indexOf(value) != -1) {
                element.classList.remove('d-none');
            } else {
                element.classList.add('d-none');
            }
        });
    });

}
