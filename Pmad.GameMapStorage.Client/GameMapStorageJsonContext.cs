using System.Text.Json.Serialization;
using Pmad.GameMapStorage.Client.Models;

namespace Pmad.GameMapStorage.Client
{
    [JsonSourceGenerationOptions(
        PropertyNameCaseInsensitive = true,
        UseStringEnumConverter = true)]
    [JsonSerializable(typeof(GameJsonBase))]
    [JsonSerializable(typeof(GameJsonBase[]))]
    [JsonSerializable(typeof(GameJson))]
    [JsonSerializable(typeof(GameMapJsonBase))]
    [JsonSerializable(typeof(GameMapJsonBase[]))]
    [JsonSerializable(typeof(GameMapJson))]
    [JsonSerializable(typeof(GameMapLayerJson))]
    [JsonSerializable(typeof(GameMapLocationJson))]
    [JsonSerializable(typeof(GameMarkerJson))]
    [JsonSerializable(typeof(GameColorJson))]
    [JsonSerializable(typeof(GamePaperMapPage))]
    [JsonSerializable(typeof(GamePaperMapJson))]
    [JsonSerializable(typeof(GamePaperMapJson[]))]
    [JsonSerializable(typeof(GamePaperMapMapJson))]
    [JsonSerializable(typeof(GamePaperMapMapJson[]))]
    [JsonSerializable(typeof(PaperMapDefinition))]
    [JsonSerializable(typeof(AccessTokenResponse))]
    internal sealed partial class GameMapStorageJsonContext : JsonSerializerContext
    {
    }
}
