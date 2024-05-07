namespace GameMapStorageWebSite.Works.ProcessLayers
{
    public class ProcessLayerWorkData
    {
        public ProcessLayerWorkData(int gameMapLayerId, List<ProcessLayerItem> items)
        {
            GameMapLayerId = gameMapLayerId;
            Items = items;
        }

        public int GameMapLayerId { get; }

        public List<ProcessLayerItem> Items { get; }
    }
}
