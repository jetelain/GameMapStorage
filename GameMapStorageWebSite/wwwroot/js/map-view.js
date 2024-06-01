
function mapInit(mapInfos) {

    var map = GameMapUtils.basicInit(mapInfos);

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
