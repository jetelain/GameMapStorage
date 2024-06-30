using System.Security.Cryptography;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Microsoft.AspNetCore.WebUtilities;

namespace GameMapStorageWebSite.Entities
{
    public class ApiKey
    {
        public int ApiKeyId { get; set; }

        public required DateTime CreatedUtc { get; set; }

        public required string Hash { get; set; }

        public required string Salt { get; set; }

        public required string Title { get; set; }

        public bool IsValid(string key)
        {
            return Hash == HashKey(key, Convert.FromBase64String(Salt));
        }

        public static ApiKey Create(string title, string key)
        {
            byte[] salt = new byte[32];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(salt);
            }
            return new ApiKey()
            {
                Hash = HashKey(key, salt),
                Salt = Convert.ToBase64String(salt),
                CreatedUtc = DateTime.UtcNow,
                Title = title
            };
        }

        private static string HashKey(string key, byte[] salt)
        {
            return Convert.ToBase64String(KeyDerivation.Pbkdf2(key, salt, KeyDerivationPrf.HMACSHA512, 100_000, 64));
        }

        public static (ApiKey Entity, string ClearText) Create(string title)
        {
            byte[] key = new byte[96];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(key);
            }
            var apiKey = WebEncoders.Base64UrlEncode(key);
            return (Create(title, apiKey), apiKey);
        }
    }
}
