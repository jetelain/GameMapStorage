/**
 * Map search functionality for the home page
 * Provides real-time search across all maps with thumbnail previews
 */
(function() {
    'use strict';

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMapSearch);
    } else {
        initializeMapSearch();
    }

    function initializeMapSearch() {
        var searchTimeout;
        var searchInput = document.getElementById('mapSearchInput');
        var searchResults = document.getElementById('searchResults');

        if (!searchInput || !searchResults) {
            return; // Elements not found, search not available on this page
        }

        var searchUrl = searchInput.getAttribute('data-search-url');
        if (!searchUrl) {
            console.error('Map search: data-search-url attribute not found');
            return;
        }

        // Close search results when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });

        // Handle input changes with debouncing
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            var query = searchInput.value.trim();

            if (query.length < 2) {
                searchResults.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(function() {
                performSearch(query, searchUrl, searchResults);
            }, 300); // Debounce delay of 300ms
        });

        // Clear search on escape key
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' || e.keyCode === 27) {
                searchInput.value = '';
                searchResults.style.display = 'none';
            }
        });
    }

    /**
     * Perform the search via AJAX and display results
     */
    function performSearch(query, url, resultsContainer) {
        fetch(url + '?query=' + encodeURIComponent(query))
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Search request failed');
                }
                return response.json();
            })
            .then(function(results) {
                displayResults(results, resultsContainer);
            })
            .catch(function(error) {
                console.error('Map search error:', error);
                resultsContainer.innerHTML = '<div class="p-3 text-danger">Error searching maps</div>';
                resultsContainer.style.display = 'block';
            });
    }

    /**
     * Display search results in the dropdown
     */
    function displayResults(results, container) {
        if (results.length === 0) {
            container.innerHTML = '<div class="p-3 text-muted">No maps found</div>';
            container.style.display = 'block';
            return;
        }

        var html = '<div class="list-group list-group-flush">';
        results.forEach(function(map) {
            var escapedMapUrl = escapeHtml(map.mapUrl);
            var escapedThumbnailUrl = escapeHtml(map.thumbnailUrl);
            var escapedMapTitle = escapeHtml(map.mapTitle);
            var escapedGameTitle = escapeHtml(map.gameTitle);
            var altText = 'Map thumbnail for ' + escapedMapTitle + ' in ' + escapedGameTitle;
            
            html += '<a href="' + escapedMapUrl + '" class="list-group-item list-group-item-action">';
            html += '<div class="d-flex align-items-center">';
            html += '<img src="' + escapedThumbnailUrl + '" alt="' + altText + '" class="me-3" style="width: 80px; height: 80px; object-fit: cover;" />';
            html += '<div>';
            html += '<h6 class="mb-1">' + escapedMapTitle + '</h6>';
            html += '<small class="text-muted">' + escapedGameTitle + '</small>';
            html += '</div>';
            html += '</div>';
            html += '</a>';
        });
        html += '</div>';

        container.innerHTML = html;
        container.style.display = 'block';
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();
