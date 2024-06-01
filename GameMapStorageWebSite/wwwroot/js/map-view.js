
function mapInit(mapInfos) {

    var map = GameMapUtils.basicInit(mapInfos);

    GameMapUtils.handToolButton().addTo(map);

    let lastMeasure;
    GameMapUtils.measurePathToolButton({ baseClassName: 'btn btn-sm mt-0' })
        .on('added', ev => { lastMeasure = ev.marker; })
        .on('started', ev => { if (lastMeasure) { lastMeasure.remove(); lastMeasure = null; } })
        .addTo(map);

    GameMapUtils.toggleToolButton({ tool: GameMapUtils.ruler, content: '<img src="/img/ruler.svg" width="16" height="16" class="revertable"/>' }).addTo(map);
    GameMapUtils.toggleToolButton({ tool: GameMapUtils.coordinateScale, content: '<img src="/img/grid.svg" width="16" height="16" class="revertable"/>' }).addTo(map);
    GameMapUtils.toggleToolButton({ tool: GameMapUtils.protractor, content: '<img src="/img/protractor.svg" width="16" height="16" class="revertable" />' }).addTo(map);


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
