namespace GameMapStorageWebSite.Entities
{
    public sealed class GameMarkerIdentifier : IGameMarkerIdentifier
    {
        public GameMarkerIdentifier(int gameId, int gameMarkerId) 
        {
            GameId = gameId;
            GameMarkerId = gameMarkerId;
        }

        public int GameMarkerId { get; }

        public int GameId { get; }
    }
}
