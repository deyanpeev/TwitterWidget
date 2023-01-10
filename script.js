const URL = {
    BASE: "http://localhost:3010",
    TWITTER_TIMELINE: 'interface/twitter/request_timeline.php'
};
const HTML_IDS = {
    TWEET_CONTAINTER: 'tweets-container',
    TWEET_USERNAME: 'username',
    TWEET_CONTENT: 'tweet',
    TWEET_DATE: 'date',
};
const HEADERS = {
    LAST_MODIFIED: 'Last-Modified',
    NOT_MODIFIED: 'notModified'
};
const DEFAULTS = {
    ANIMATION_TIME: 1500,
    IMAGE: "Default Twitter Background.jpg",
    TWEET_UPDATE_MIN: 1,
    DURATION: 15000
}

var tweetIndex = 0;
var queryParams;

loadQueryParams();
setStaticParams();

startTweetProcessing();

function loadQueryParams() {
    function getParameterByName(name, url = window.location.href) {
        name = name.replace(/[\[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    queryParams = {};
    queryParams.username = getParameterByName('username');
    queryParams.duration = getParameterByName('duration');
    queryParams.animation = getParameterByName('animation');
    queryParams.backgroundColor = getParameterByName('backgroundColor');
    queryParams.backgroundImage = getParameterByName('backgroundImage');
    queryParams.dateFormat = getParameterByName('dateFormat');
}

//some query params never changes and will be constantly set once
function setStaticParams() {
    document.getElementById(HTML_IDS.TWEET_USERNAME).innerHTML = '<span>' + queryParams.username + '</span>';
    document.getElementById(HTML_IDS.TWEET_DATE).innerHTML = '<span>' + new Date().getFullYear() + '</span>';

    //background
    if (queryParams.backgroundImage) {
        document.body.style.backgroundImage = 'url(' + queryParams.backgroundImage + ')';
    } else if (queryParams.backgroundColor) {
        document.body.style.backgroundColor = queryParams.backgroundColor;
    } else {
        document.body.style.backgroundImage = "url('" + DEFAULTS.IMAGE + "')";
    }
}

function startTweetProcessing() {
    let restHandler = tweetRestHandler();
    let storage = localStorageWrapper();

    updateTweets(startTweetVisualization);
    setInterval(() => {
        updateTweets()
    }, DEFAULTS.TWEET_UPDATE_MIN * 60 * 1000);

    function updateTweets(callback) {
        localStorageTweets = storage.getData(storage.ITEMS.TWEETS);
        restHandler.getLastExecution().then(lastExecution => {
            if (!localStorageTweets ||
                (lastExecution !== HEADERS.NOT_MODIFIED
                    && new Date(localStorageTweets.lastExecution).getTime() !== new Date(lastExecution).getTime())) {
                restHandler.getTweets().then(tweets => {
                    tweetData = {
                        elements: tweets,
                        lastExecution: lastExecution
                    }
                    
                    storage.setData(storage.ITEMS.TWEETS, tweetData);
                    tweetIndex = 0;

                    if (callback) {
                        callback();
                    }
                })
            } else {
                if (callback) {
                    callback();
                }
            }
        });
    }
}

function startTweetVisualization() {
    let visualizer = tweetVisualizer();
    let storage = localStorageWrapper();

    let tweets = storage.getData(storage.ITEMS.TWEETS);
    if (!tweets.elements || !tweets.elements.length) {
        throw new Error("There are no tweets to display. Tweets can't be empty.");
    }

    visualizer.animateTweet(tweets.elements[tweetIndex++]);
    setInterval(function () {
        tweets = storage.getData(storage.ITEMS.TWEETS);

        if (!tweets.elements || !tweets.elements.length) {
            throw new Error("There are no tweets to display. Tweets can't be empty.");
        }
        if (tweetIndex >= tweets.elements.length) {
            tweetIndex = 0;
        }

        visualizer.animateTweet(tweets.elements[tweetIndex++]);
    }, (queryParams.duration || DEFAULTS.DURATION) * 1000);
}

function tweetRestHandler() {
    let params = {
        username: queryParams.username
    }
    var url = constructUrl(params);

    function getTweets() {
        return fetch(url, {
            method: 'POST',
            body: {}
        }).then(response => response.json())
            .then(data => {
                return data;
            });
    }

    function getLastExecution() {
        return fetch(url, {
            method: 'HEAD'
        }).then(response => {
            if (response.status === 304) {
                return HEADERS.NOT_MODIFIED;
            } else if (response.status === 200) {
                return response.headers.get(HEADERS.LAST_MODIFIED);
            } else {
                return 'error';
            }
        })
            .catch(error => console.log(error));
    }

    function constructUrl(params) {
        let queryParams = Object.keys(params).map(p => p + '=' + encodeURIComponent(params[p])).join('&');
        return URL.BASE + '/' + URL.TWITTER_TIMELINE + '?' + queryParams;
    }

    return {
        getLastExecution: getLastExecution,
        getTweets: getTweets
    }
}

function tweetVisualizer() {
    const MOVE_DIRECTION = {
        HORIZONTAL: 'top',
        VERTICAL: 'left'
    }

    var animateMethod = queryParams.animation;
    var animationTime = DEFAULTS.ANIMATION_TIME;

    let elementText = $("#" + HTML_IDS.TWEET_CONTENT + ">span");
    let elementDate = $("#" + HTML_IDS.TWEET_DATE + ">span");
    let elementParentText = elementText.parent();
    let elementParentDate = elementDate.parent();

    var defaultPositions = {
        text: {
            top: parseInt(elementText.css('top')),
            left: parseInt(elementText.css('left'))
        },
        date: {
            top: parseInt(elementDate.css('top')),
            left: parseInt(elementDate.css('left'))
        }
    };
    var parentDimensions = {
        text: {
            height: parseInt(elementParentText.css('height')) + 2 * parseInt(elementParentText.css('padding')),
            width: parseInt(elementParentText.css('width')) + 2 * parseInt(elementParentText.css('padding'))
        },
        date: {
            height: parseInt(elementParentDate.css('height')) + 2 * parseInt(elementParentDate.css('padding')),
            width: parseInt(elementParentDate.css('width')) + 2 * parseInt(elementParentDate.css('padding'))
        }
    };

    function animateTweet(tweet) {
        let animationCallback;
        switch (animateMethod.toUpperCase()) {
            case 'FADEINOUT':
                animationCallback = animateFadeInOut;
                break;
            case 'SLIDETOP':
                animationCallback = animateSlideTop;
                break;
            case 'SLIDEBOTTOM':
                animationCallback = animateSlideBottom;
                break;
            case 'SLIDERIGHT':
                animationCallback = animateSlideRight;
                break;
            case 'SLIDELEFT':
                animationCallback = animateSlideLeft;
                break;
        }

        animationCallback(elementText, tweet.text, defaultPositions.text, parentDimensions.text);
        animationCallback(elementDate, moment(new Date(tweet.created)).format(queryParams.dateFormat),
            defaultPositions.date, parentDimensions.date);
    }

    function animateSlideTop(element, newText, defaultPosition, parentDimension) {
        movePosition(MOVE_DIRECTION.VERTICAL, element, newText, 
            defaultPosition.top - parentDimension.height, defaultPosition.top);
    }

    function animateSlideBottom(element, newText, defaultPosition, parentDimension) {
        movePosition(MOVE_DIRECTION.VERTICAL, element, newText, 
            defaultPosition.top + parentDimension.height, defaultPosition.top);
    }

    function animateSlideLeft(element, newText, defaultPosition, parentDimension) {
        movePosition(MOVE_DIRECTION.HORIZONTAL, element, newText, 
            defaultPosition.left - parentDimension.width, defaultPosition.left);
    }

    function animateSlideRight(element, newText, defaultPosition, parentDimension) {
        movePosition(MOVE_DIRECTION.HORIZONTAL, element, newText, 
            defaultPosition.left + parentDimension.width, defaultPosition.left);
    }

    function movePosition(direction, element, newText, moveTo, initialPosition) {
        switch (direction) {
            case MOVE_DIRECTION.HORIZONTAL:
                let initialWidth = parseInt(element.css('width'));
                element.animate({
                    left: moveTo,
                    width: initialWidth
                }, animationTime, function () {
                    $(this).html(newText).animate({
                        left: initialPosition
                    }, animationTime);
                });
                break;
            case MOVE_DIRECTION.VERTICAL:
                $(element).animate({
                    top: moveTo
                }, animationTime, function () {
                    $(this).html(newText).animate({
                        top: initialPosition
                    }, animationTime);
                });
                break;
        }
    }

    function animateFadeInOut(element, newText) {
        $(element).fadeOut(animationTime, function () {
            $(this).html(newText).fadeIn(animationTime);
        });
    }

    return {
        animateTweet: animateTweet
    }
}

function localStorageWrapper() {
    function getData(key) {
        let item = localStorage.getItem(key);
        if (typeof item === 'string' || item instanceof String) {
            let parseItem = null;
            try {
                parseItem = JSON.parse(item);
            } catch (err) {
                //string is not an object
            }

            if (parseItem) {
                item = parseItem;
            }
        }
        return item;
    }

    function setData(key, data) {
        if (typeof data === 'object') {
            data = JSON.stringify(data);
        }

        localStorage.setItem(key, data);
    }

    return {
        getData: getData,
        setData: setData,
        ITEMS: {
            TWEETS: 'tweets-' + queryParams.username
        }
    }
}
