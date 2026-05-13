# Pmad.GameMapStorage.Client

.NET client library for the [GameMapStorage](https://github.com/jetelain/GameMapStorage) API.  
The default public endpoint is **https://atlas.plan-ops.fr/**.

## Installation

```
dotnet add package Pmad.GameMapStorage.Client
```

## Quick start

### Standalone (no DI)

```csharp
using Pmad.GameMapStorage.Client;

var httpClient = new HttpClient { BaseAddress = new Uri("https://atlas.plan-ops.fr/") };
var client = new GameMapStorageClient(httpClient);

// List all games
var games = await client.GetGamesAsync();

// Get full game metadata (markers, colors…)
var arma3 = await client.GetGameAsync("arma3");

// List maps for a game
var maps = await client.GetMapsAsync("arma3");

// Get full map metadata (layers, locations…)
var altis = await client.GetMapAsync("arma3", "altis");

// Paper maps
var paperMaps = await client.GetMapPaperMapsAsync("arma3", "altis");
var allPaperMaps = await client.GetGamePaperMapsAsync("arma3");
```

### With dependency injection

```csharp
// Program.cs
builder.Services.AddGameMapStorageClient(c =>
	c.BaseAddress = new Uri("https://atlas.plan-ops.fr/"));
```

```csharp
// In a service or controller
public class MyService(GameMapStorageClient client)
{
	public async Task DoSomethingAsync()
	{
		var maps = await client.GetMapsAsync("arma3");
	}
}
```

### With dependency injection and memory cache

Responses are cached in-process to avoid redundant HTTP calls. The default duration is **30 minutes**.

```csharp
// Program.cs — default cache duration (30 minutes)
builder.Services.AddGameMapStorageClientWithCache(c =>
	c.BaseAddress = new Uri("https://atlas.plan-ops.fr/"));

// Custom duration
builder.Services.AddGameMapStorageClientWithCache(
	c => c.BaseAddress = new Uri("https://atlas.plan-ops.fr/"),
	cacheDuration: TimeSpan.FromHours(1));
```

You can also inject `IMemoryCache` manually when not using DI extensions:

```csharp
var cache = new MemoryCache(new MemoryCacheOptions());
var client = new GameMapStorageClient(httpClient, cache)
{
	CacheDuration = TimeSpan.FromMinutes(15)
};
```

Setting `CacheDuration` to `TimeSpan.Zero` disables caching at runtime without changing the cache instance.

## Admin client

`GameMapStorageAdminClient` covers write operations (uploading map layers and paper maps).  
It requires an API key issued by the GameMapStorage instance administrator.

### Authentication

```csharp
var adminClient = new GameMapStorageAdminClient(httpClient);

// Fetches a bearer token and stores it on the HttpClient for all subsequent calls
await adminClient.AuthenticateAsync(apiKeyId: 1, apiKey: "your-secret-key");
```

### Upload a map layer package

```csharp
// Create a new layer
await using var stream = File.OpenRead("altis.zip");
await adminClient.CreateLayerFromPackageAsync(stream, "altis.zip");

// Update an existing layer (layerId = GameMapLayerId)
await using var stream = File.OpenRead("altis-v2.zip");
await adminClient.UpdateLayerFromPackageAsync(layerId: 42, stream, "altis-v2.zip");
```

### Upload a paper map

```csharp
var definition = new PaperMapDefinition
{
	GameName = "arma3",
	MapName  = "altis",
	Name     = "Altis 1:50 000",
	Scale    = 50_000,
	FileFormat = PaperFileFormat.SinglePDF,
	PaperSize  = PaperSize.A3,
	Pages = [new GamePaperMapPage { PageNumber = 1, /* … */ }]
};

// Create
await using var pdf = File.OpenRead("altis.pdf");
await adminClient.CreatePaperMapAsync(definition, pdf, "altis.pdf");

// Update (paperMapId = GamePaperMapId)
await using var pdf = File.OpenRead("altis-v2.pdf");
await adminClient.UpdatePaperMapAsync(paperMapId: 7, definition, pdf, "altis-v2.pdf");
```

### Admin client with DI

```csharp
builder.Services.AddGameMapStorageAdminClient(c =>
{
	c.BaseAddress = new Uri("https://atlas.plan-ops.fr/");
	c.Timeout = TimeSpan.FromMinutes(30); // large uploads can take a while
});
```

```csharp
public class UploadService(GameMapStorageAdminClient adminClient)
{
	public async Task UploadAsync(int apiKeyId, string apiKey, string zipPath)
	{
		await adminClient.AuthenticateAsync(apiKeyId, apiKey);
		await using var stream = File.OpenRead(zipPath);
		await adminClient.CreateLayerFromPackageAsync(stream, Path.GetFileName(zipPath));
	}
}
```

## Models

| Type | Description |
|---|---|
| `GameJsonBase` | Lightweight game info (id, name, logo URLs) |
| `GameJson` | Full game info including `Colors` and `Markers` |
| `GameMapJsonBase` | Lightweight map info (id, name, size, thumbnail URLs, layers) |
| `GameMapJson` | Full map info including `Attribution` and `Locations` |
| `GameMapLayerJson` | Tile layer metadata (zoom range, tile size, tile URL patterns) |
| `GameMapLocationJson` | Named location on a map (city, …) |
| `GameMarkerJson` | Standard marker (icon URLs, color compatibility) |
| `GameColorJson` | Standard color (hex value, usage) |
| `GamePaperMapJson` | Paper map file (format, size, scale, download URL) |
| `GamePaperMapMapJson` | Paper map file with its parent map info |
| `PaperMapDefinition` | Input definition used to create or update a paper map |

## Compatibility

- **.NET 8** or later
- **Native AOT** compatible — JSON serialization uses source generation, no runtime reflection
