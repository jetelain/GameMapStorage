namespace GameMapStorageWebSite.Works.UnpackLayers
{
    public class UnpackLayerWorkData
    {
        public UnpackLayerWorkData(int gameMapLayerId)
        {
            GameMapLayerId = gameMapLayerId;
        }

        public int GameMapLayerId { get; }
    }
}
