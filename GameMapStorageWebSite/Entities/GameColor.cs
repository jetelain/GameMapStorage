namespace GameMapStorageWebSite.Entities
{
    public class GameColor
    {
        public int GameColorId { get; set; }

        public required string EnglishTitle { get; set; }

        public required string Name { get; set; }

        public required string Hexadecimal {  get; set; }

        public ColorUsage Usage { get; set; }

        // FK to Game
        public int GameId { get; set; }

        public Game? Game { get; set; }

    }
}
