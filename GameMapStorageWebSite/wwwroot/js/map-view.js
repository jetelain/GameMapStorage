
function mapInit(mapInfos) {

    var map = GameMapUtils.basicInit(mapInfos);

    GameMapUtils.addCoordinateScaleToMap(map, mapInfos);
    GameMapUtils.addProtractorToMap(map, mapInfos);

    document.querySelectorAll(".location-link").forEach(element => {
        element.addEventListener("click", event => {
            event.stopPropagation();
            event.preventDefault();
            map.setView([
                Number(element.getAttribute("data-location-y")),
                Number(element.getAttribute("data-location-x"))
            ], mapInfos.maxZoom);
        });
        console.log(element);
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
