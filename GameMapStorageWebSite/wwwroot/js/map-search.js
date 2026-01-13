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
                showMessage(resultsContainer, 'Error searching maps', 'text-danger');
            });
    }

    /**
     * Display search results in the dropdown
     */
    function displayResults(results, container) {
        container.textContent = '';

        if (!Array.isArray(results) || results.length === 0) {
            showMessage(container, 'No maps found', 'text-muted');
            return;
        }

        var listGroup = document.createElement('div');
        listGroup.className = 'list-group list-group-flush';

        results.forEach(function(map) {
            var link = document.createElement('a');
            link.className = 'list-group-item list-group-item-action';
            link.href = map.mapUrl || '#';

            var contentWrapper = document.createElement('div');
            contentWrapper.className = 'd-flex align-items-center';

            var thumbnail = document.createElement('img');
            thumbnail.className = 'me-3';
            thumbnail.src = map.thumbnailUrl || '';
            thumbnail.alt = 'Map thumbnail for ' + (map.mapTitle || '') + ' in ' + (map.gameTitle || '');
            thumbnail.style.width = '80px';
            thumbnail.style.height = '80px';
            thumbnail.style.objectFit = 'cover';

            var textContainer = document.createElement('div');

            var title = document.createElement('h6');
            title.className = 'mb-1';
            title.textContent = map.mapTitle || '';

            var subtitle = document.createElement('small');
            subtitle.className = 'text-muted';
            subtitle.textContent = map.gameTitle || '';

            textContainer.appendChild(title);
            textContainer.appendChild(subtitle);
            contentWrapper.appendChild(thumbnail);
            contentWrapper.appendChild(textContainer);
            link.appendChild(contentWrapper);
            listGroup.appendChild(link);
        });

        container.appendChild(listGroup);
        container.style.display = 'block';
    }

    function showMessage(container, message, textClass) {
        container.textContent = '';
        var messageDiv = document.createElement('div');
        messageDiv.className = 'p-3 ' + (textClass || '');
        messageDiv.textContent = message;
        container.appendChild(messageDiv);
        container.style.display = 'block';
    }
})();
