(function($) {

    var setting = {
        fps: 29.97,
        id: 0,
        timer: 0, // for navigation and control bar;
        playerHeight: 0,
        showSliderBar: false,
        mouseOutVideo: true,
        lock: false, // lock animating;
        interactive: 'always-on', // always-on, on-hover, always-off;
        touchEnabled: (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0))
    };

    var hoverCounter = {};
    var movieLengthGA = {};
    //var bubbleShifted = false;
    var moreInfoText = { 1: 'More Info', 2: 'Order Fit Kit' };
    var detailBarOpen = 0;


    var subitems = {};
    var products = {};
    var annotations = {};
    var productSelected = {};

    var itemTemplate =
        '<div class="product-item" id="k-{id}">' +
            '<div class="img"><img src="{image}" alt="" /></div>' +
            '<div class="detail-product">' +
            '<div class="clearfix">' +
            '<div class="title">{name}</div>' +
            '</div>' +
            '</div>' +
            '</div>';

    // reference at lorel 2012-10;
    var sendReport = function(info) {
        //var info = "productid=" + productSelected["product_id"] + "&videoid=" + videoid + "&analytictype=" + analytic;
        return;
        try {
            $.ajax({
                method: 'post',
                url: "http://174.129.222.206/FuiszMediaStudio/SecondLayerAnalytics",
                data: info,
                success: function(data) {
                    window["console"] && console.log(data);
                }
            });
        } catch (e) {}
    };
    var UIControl = {
        events: {},
        index: 0,
        addEvent: function(name, obj, func) {
            var self = this;
            ++ self.index;
            if (!self.events[name]) {
                self.events[name] = [];
            }
            obj['e' + self.index] = true;
            self.events[name]['e' + self.index] = { obj: obj, func: func };
        },
        fireEvent: function(name, data) {
            var self = this, subevent;
            for (var i in self.events[name]) {
                subevent = self.events[name][i];
                subevent.func.call(subevent.obj, data);
            }
        },
        removeEvent: function(name) {
            var self = this;
            self.events[name] = [];
        }
    };

    function onTouch(evt) {
        evt.preventDefault();

        var touches = evt.touches || evt.originalEvent.touches,
            evType = evt.type || evt.originalEvent.type,
            changedTouches = evt.changedTouches || evt.originalEvent.changedTouches,
            originalTarget = evt.originalTarget || evt.originalEvent.target;
        //now = new Date().getTime(),
        //$el = $(this),
        //delta = $el.attr('lastTouch') ? now - $el.attr('lastTouch') : 0,
        //delay = 300;

        if (touches.length > 1 || (evType == "touchend" && touches.length > 0))
            return;

        var newEvt = document.createEvent("MouseEvents");
        var type = null;
        var touch = null;
        switch (evType) {
            case "touchstart":    type = "click";    touch = changedTouches[0];break;
            //case "touchmove":        type = "mousemove";    touch = changedTouches[0];break;
            //case "touchend":        type = "mouseout";    touch = changedTouches[0];break;
        }
        /*
         if (evType == 'touchstart') {
         if (delta < delay && delta > 30) {
         $el.attr('lastTouch', null);
         type = 'click';
         }
         $el.attr('lastTouch', now);
         }
         */
        if (type == 'click') {
            newEvt.initMouseEvent(type, true, true, originalTarget.ownerDocument.defaultView, 0,
                touch.screenX, touch.screenY, touch.clientX, touch.clientY,
                evt.ctrlKey, evt.altKey, evt.shirtKey, evt.metaKey, 0, null);
            originalTarget.dispatchEvent(newEvt);
            // also show mouseover
            var hoverEvt = document.createEvent("MouseEvents");
            hoverEvt.initMouseEvent('mousemove', true, true, originalTarget.ownerDocument.defaultView, 0,
                touch.screenX, touch.screenY, touch.clientX, touch.clientY,
                evt.ctrlKey, evt.altKey, evt.shirtKey, evt.metaKey, 0, null);
            originalTarget.dispatchEvent(hoverEvt);
        }
    }

    $.extend(MediaElementPlayer.prototype,  {
        buildinteractive: function(player, controls, layers, media) {
            player.setting = setting;
            var interactive =
                $("<div class='mejs-interactive mejs-button'>" +
                    '<button type="button" class="btn-interactive" title="interactive"></button>' +
                    "<div class='popup-interactive'>" +
                    "<div class='popup-title'>Settings</div>" +
                    "<div class='options' data-active='always-on' >On</div>" +
                    "<div class='options' data-active='always-off' >Off</div>" +
                    "</div>" +
                    "</div>").appendTo(controls);

            var popup = interactive.find(".popup-interactive");

            interactive.find(".btn-interactive").click(function(event) {
                $(this).toggleClass("active");
                popup.toggle();
                event.stopPropagation();
            });

            var option = interactive.find(".options");

            option.click(function() {
                option.removeClass("selected");
                $(this).addClass("selected");
                var state = $(this).data("active");
                UIControl.fireEvent('interactive-change', state);
            });

            UIControl.addEvent('interactive-change', {}, function(state) {
                layers.attr('class', 'mejs-layers').addClass(state);
                setting.interactive = state;
            });

            // setup for default;
            $(option.get(0)).trigger("click");

            $(document.body).click(function() {
                popup.hide();
                interactive.find('.btn-interactive').removeClass('active');
            });
        },

        buildseparator: function(player, controls, layers, media) {
            $("<div class='mejs-separa'></div>").appendTo(controls);
        },

        buildplacehold: function(player, controls, layers, media) {
            $('<div class="extend"></div>').appendTo(controls);
        },

        buildsplashpage: function(player, controls, layers, media) {

            var splash =
                $('<div class="splash-page">' +
                    '<div class="content">' +
                        '<div>' +
                            '<h2>SHOP</h2>' +
                            '<h2>THE VIDEO</h2>' +
                            '<div class="detail">click to your favorite look to learn more</div>' +
                        '</div>' +
                        '<div class="play"></div> ' +
                    '</div>' +
                    '</div>').appendTo(layers);

            splash.click(function() {
                splash.fadeOut(500);
                player.play();
                UIControl.fireEvent('start-video');
            });
        },

        buildcursor: function(player, controls, layers, media) {
            $("<div class='mejs-cursor fix-size' id='mejs-cursor'></div>").appendTo(layers);
        },

        buildnavigation: function(player, controls, layers, media) {

            var itemsSelected = 0;

            var navigation =
                $('<div class="mejs-header fix-size mejs-navigation" >' +
                    '<div class="title">' + player.options.title +'</div>' +
                    '<div class="right hide">'+
                    '</div>' +
                    '<div style="clear:both"></div>' +
                    '</div>')
                    .appendTo(layers);


            UIControl.addEvent('start-video', {} , function() {
                navigation.find('.right').removeClass('hide');

                setting.timer = setTimeout(function() {
                    if (setting.showSliderBar == false) {
                        navigation.stop().animate({top: -26});
                        controls.stop().animate({bottom: -26});
                    }
                }, 2000);

            });

            UIControl.addEvent('change-guide', {}, function(text) {
                navigation.find('.title').html(text);
            });

            UIControl.addEvent('show-detaibar', {}, function() {
//                navigation.stop().animate({left: -300});
//                controls.stop().animate({left: -300, bottom: -26});
//                UIControl.fireEvent('change-guide', '');
            });


            UIControl.addEvent('hide-detaibar', {}, function() {
                // for first time, keep hidden when video start play;
                if (setting.mouseOutVideo == true) return;
                navigation.stop().animate({left: 0});
                controls.stop().animate({left: 0, bottom: 0}, function() {
                    setting.lock = false;
                });
            });

            $(document.body).bind("mousemove mouserover", function(evt) {
                setting.mouseOutVideo = false;
                clearTimeout(setting.timer);
                if (!setting.showSliderBar && !setting.lock) {
                    // lock animate;
                    setting.lock = true;
                    navigation.stop().animate({left: 0, top: 0});
                    controls.stop().animate({left: 0, bottom: 0}, function() {
                        // unlock animate;
                        setting.lock = false;
                    });
                }
            }).mouseout(function() {
                    setting.mouseOutVideo = true;
                    clearTimeout(setting.timer);
                    setting.timer = setTimeout(function() {
                        if (setting.showSliderBar == false) {
                            navigation.stop().animate({top: -26});
                            controls.stop().animate({bottom: -26});
                        }
                    }, 2000);
                });

        },

        builddetailbar: function(player, controls, layers, media) {

            var detailBar = $('<div class="detail-bar"><div class="wrap-content"></div></div>').appendTo(layers)

//            var detailBar = $('<div class="detail-bar fix-size">' +
//                '</div>').appendTo(layers);

            $(document).on('click', 'a.more-info', function (e) {
                e.preventDefault();
                var productid = $(this).attr("product-id");
                if (subitems[productid]) {
                    var product = subitems[productid][0];
                    ga('send', 'event', product.name, 'more-info', 'video-' + project_id + '-products');
                }
                window.open($(this).attr('href'),'_blank');
            });

            UIControl.addEvent('show-detaibar', {}, function(productView) {
                setting.showSliderBar = true;
                productSelected = productView[0];

                $.ajax({
                    url : "items/"+productSelected.productid+"/detail.html",
                    success : function(result){
                        $('.detail-bar .wrap-content').html(result);
                        detailBar.fadeIn();
                    }
                });

                console.log(productSelected);

//                detailBar.find('.content').html('<iframe src="items/'+productSelected.productid+'/index.htm" style="width: 100%; height: 100%;" frameborder="0" scrolling="no"></iframe>');

//                updateProductData(productSelected);
//                detailBar.stop().animate({right: 0});
            });

            UIControl.addEvent('hide-detaibar', {}, function() {
                setting.showSliderBar = false;

                detailBar.fadeOut();

//                detailBar.stop().animate({right: -300});
            });

//            CLOSE INFOBAR
            detailBar.on('click', '.action .close', function() {
                UIControl.fireEvent('hide-detaibar');
                UIControl.fireEvent('start-video');
                player.play();
            });

            detailBar.find(".dropdown .arrow").click(function(evt) {
                detailBar.find(".dropdown .opts").hide();
                evt.stopPropagation();
                var dropdown = $(this).parent();
                dropdown.find('.opts').show();
            });

            detailBar.find(".dropdown .opts .item").click(function() {
                var dropdown = $(this).parents('.dropdown');
                dropdown.find('.value').html($(this).html());
            });

            $(document.body).click(function() {
                detailBar.find(".dropdown .opts").hide();
            });

        }

    });


    $.extend(MediaElementPlayer.prototype, {
        buildannotation: function(player, controls, layers, media) {
            if (window.location != window.top.location) {
                document.body.className = "embed";
            }

            setting.playerHeight = player.height;
            setting.fps = player.options.fps;
            setting.id = player.options.id;

            this.loadSubItem();
            this.loadAnnotation();

            // for annotations;
            var annotation =
                $("<div class='mejs-annotations fix-size'>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "<div class='rect'></div>" +
                    "</div>")
                    .appendTo(layers);

            var mediaelement = $(".mejs-mediaelement");

            UIControl.addEvent('show-detaibar', {}, function() {
//                layers.removeClass('show-rect');
//                annotation.stop().animate({left: -setting.offsetLeft}, function () {
                    /*if (!bubbleShifted) {
                     bubbleShifted = true;
                     $('.bubble-popup').css({left: (parseInt($('.bubble-popup').css('left'), 10) - setting.offsetLeft)});

                     }*/
//                });
//                $('.bubble-popup').hide();
//                mediaelement.stop().animate({left: -setting.offsetLeft});
                //$('.detail-bar .action', layers).css('width', (parseInt($('.detail-bar:first', layers).css('width'), 10)));
            });

            UIControl.addEvent('hide-detaibar', {}, function() {
                setting.showRect && layers.addClass('show-rect');
                annotation.stop().animate({left: 0});
                //$('.bubble-popup').stop().animate({left: (parseInt($('.bubble-popup').css('left'), 10) + setting.offsetLeft)});
                //bubbleShifted = false;
                mediaelement.stop().animate({left: 0});
                detailBarOpen = 0;
            });

            var dialog =
                $('<div class="mejs-dialog">' +
                    '<div class="popup bubble-popup">' +
                    '<div class="cover-popup">' +
                    '<div class="product-info">' +
                    '<div class="product-name"></div>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '<div class="to-wishlist"></div>' +
                    '</div>')
                    .insertAfter(controls);
            var bubble = dialog.find(".bubble-popup");

            if (setting.touchEnabled) {
                $('.rect', annotation).bind('touchstart', onTouch);
            }
//
            annotation.find('.rect').mouseout(function() {
                var productid = $(this).attr("product-id");
                // send hover effect to google analitics
                if (hoverCounter[productid]) {
                    delete hoverCounter[productid];
                }
                bubble.hide();
                $(this).removeClass('hover');
            }).mousemove(function(e) {
                    //show preview popup;
                    var productid = $(this).attr("product-id");
                    if (!subitems[productid]) return;
                    var product = subitems[productid][0];

                    // send GA event
                    if (!hoverCounter[productid]) {
                        hoverCounter[productid] = true;
                        ga('send', 'event', hoverCounter[productid].label, hoverCounter[productid].type, hoverCounter[productid].cat);
                    }

                    var offsetLeft = $(window).scrollLeft() || 0;
                    var offsetTop = $(window).scrollTop() || 0;
                    var positionEvent = {
                        left: e.clientX + offsetLeft,
                        top: e.clientY + offsetTop
                    };

                    // show litle data;
                    dialog.find(".product-name").html(product.name);
//                    if(!player.media.paused){
                        bubble.show()
                            .css({
                                top:  positionEvent.top - bubble.height() / 2,
                                left: positionEvent.left + 10
                            });
//                    }

                    $(this).addClass('hover');
                    !setting.showSliderBar && UIControl.fireEvent('change-guide',  'Click on the video to learn more.');

                }).click(function(e) {
                    e.stopPropagation();
//                for youtube player;
//                    $(".mejs-annotations .rect").hide().removeClass("show");
                    media.pluginElement && (media = media.pluginElement);

                    var productid = $(this).attr("product-id");
                    var productView = subitems[productid];
                    if (!productView || !productView.length) return;


                    if (detailBarOpen && setting.touchEnabled) {
                        annotation.height('100%');
                        bubble.hide();
                        setting.showRect = false;
                        layers.removeClass('show-rect');
                        UIControl.fireEvent('hide-detaibar');
                        UIControl.fireEvent('change-guide',  'Click on the items to learn more.');
                        player.play();
                        return;
                    }

                    player.pause();
                    var position = $(this).position();
                    setting.offsetLeft = Math.min(300, 0.7*position.left);

//                    window.open(productView[0].producturl, '_blank');

                    UIControl.fireEvent('show-detaibar', productView);
                    detailBarOpen = 1;
//                send hover effect to google analitics
                    ga('send', 'event', subitems[productid][0].name, 'click', 'video-' + project_id + '-products');
                });
            annotation.click(function() {
                player.pause();
                layers.addClass('show-rect');
                setting.showRect = true;
                UIControl.fireEvent('change-guide',  'Click on an item to learn more.');
            });

            media.addEventListener('timeupdate', function() {
                player.showAnnotation();
            }, false);

            media.addEventListener('play', function() {
                annotation.height('100%');
                bubble.hide();
                setting.showRect = false;
                layers.removeClass('show-rect');
                UIControl.fireEvent('hide-detaibar');
                UIControl.fireEvent('change-guide',  'Click on the items to learn more.');
            });

            media.addEventListener('pause', function() {
                annotation.height(0);
            });

            media.addEventListener('ended', function() {
                if (!movieLengthGA.ga100) {
                    movieLengthGA.ga100 = true;
                    ga('send', 'event', 'video-' + project_id, '100% watched', 'video-' + project_id + '-timelog');
                }
//                player.twitterSend();
            });
            player.resize(function() {
                var windowWidth = $(window).width(),
                    windowHeight = $(window).height();
                this.container.css({
                    width: windowWidth,
                    height: windowHeight
                });
                $('.mejs-mediaelement').find('object, video').css({
                    width: windowWidth,
                    height: windowHeight
                });
                this.setPlayerSize(windowWidth, windowHeight);

                // with youtube video the node.clientHeight = 0;
                var mediaHeight = this.node.clientHeight || this.node.height;
//                // update global media height;
                setting.playerHeight = mediaHeight;
                $('.container').width(windowWidth);
                $('.container').height(windowHeight);
                this.container.find(".wish-list").height(this.container.height() - 83);

                var marginTop = (windowHeight-$('.detail-bar .wrap-content').height())/2
                $('.detail-bar .wrap-content').css({
                    maxHeight: windowHeight-75,
                    marginTop: marginTop
                });

                var $this = this;
                setTimeout(function () { $this.setControlsSize(); }, 50 );
            });
            var loading = $("<div class='mejs-loading mejs-layer'></div>").appendTo(layers);
        },

        loadAnnotation: function() {
            var player = this,
                response = player.options.annotations;
            var annotationid, productid, keyframes, rects, annotationpath, frame;
            annotations = {};
            annotations.available = false;
            var result = response;
            for (var i = 0; i < result.length; ++i) {
                annotationid = result[i]["annotation_id"];
                productid = result[i]["product_id"];

                keyframes = result[i]["keyframes"].split(",");
                rects = result[i]["rects"].split("|");
                annotationpath = result[i]["annotationpath"];

                // tiny fix with missing file extension;
                if (annotationpath.replace(".jpg", "") == annotationpath) {
                    annotationpath += ".jpg";
                }

                for (var o = 0 ; o < keyframes.length; ++ o) {
                    frame = keyframes[o];
                    !annotations[frame] && (annotations[frame] = []);
                    if (!annotations[frame]["." + productid]) {
                        annotations[frame]["." + productid] = true;
                        annotations[frame].push({rect: rects[o], annotationid: annotationid, productid: productid, productpath: annotationpath});
                    }
                }
            }
            annotations.available = true;
            //console.log("annotations", annotations);
        },
        loadProduct: function() {
            $.getJSON((window["islocal"] ? "media/productlist_jsonp.json" : "http://174.129.222.206/FuiszMediaStudio/productlist_test_jsonp?videoid=" + setting.id  + "&callback=?"), function(response) {
                products = {};
                for (var i = 0; i < response.length; ++i) {
                    products[response[i]["product_id"]] = response[i];
                }
                //console.log('products', products);
            });
        },
        loadSubItem: function() {
            var player = this,
                response = player.options.items;
            subitems = {};
            for (var i = 0; i < response.length; ++i) {
                if (!subitems[response[i]["productid"]]) {
                    subitems[response[i]["productid"]] = [];
                }
                subitems[response[i]["productid"]]['push'](response[i]);
            }
            //console.log("subitems", subitems);
        },
        showAnnotation: function() {
            var player = this, frame, frameIndex, currentTime, duration;
            //youtube video node.currentTime = 0;
            currentTime = player.node.currentTime || player.media.currentTime;
            duration = player.node.duration || player.media.duration;

            frameIndex = setting.fps * currentTime << 0;
            if (frameIndex < 9 || frameIndex == setting.frameIndex) return;
            //lock state;
            setting.frameIndex = frameIndex;
            var frame = annotations[frameIndex];

            var clientHeight = player.node.clientHeight || $(player.node).height() * 1;
            var clientWidth = player.node.clientWidth || $(player.node).width() * 1;
            var videoWidth = player.options.originWidth || player.node.videoWidth || clientWidth;
            var videoHeight = player.options.originHeight || player.node.videoHeight || clientHeight;

            var offsetTop = 0; offsetLeft = 0;
            // fullscreen with youtube;
            if (player.isFullScreen == true) {
                var containerWidth = $(player.container).outerWidth();
                var containerHeight = $(player.container).outerHeight();
                // keep clientWidth/clientHeight == videoWidth/videoHeight;
                if (videoWidth / videoHeight > containerWidth / containerHeight) {
//                    clientWidth = containerWidth;
//                    clientHeight = videoHeight * (clientWidth / videoWidth);
                } else {
//                    clientHeight = containerHeight;
//                    clientWidth = videoWidth * (clientHeight / videoHeight);
                }
                offsetTop = (containerHeight - clientHeight) / 2;
                offsetLeft = (containerWidth - clientWidth) / 2;
            }

            var scaleX = clientWidth / videoWidth;
            var scaleY = clientHeight / videoHeight;
            var orientation = (scaleX > scaleY) ? 'landscape' : 'portrait';

            var realVideoWidth = (orientation == 'portrait') ? clientWidth : videoWidth * scaleY,
                realVideoHeight = (orientation == 'portrait') ? videoHeight * scaleX : clientHeight;

            var newTop = 0, newLeft = 0, newWidth = 0, newHeight = 0, i = 0;
            var rects = $(".mejs-annotations .rect").hide().removeClass("show");

            if(currentTime > 41) player.twitterSend();

//            console.log(currentTime, duration);
            if (frame && frame.length) {
                for (i = 0 ; i < frame.length; ++ i) {
                    var productid = frame[i]["productid"];
                    var productpath = frame[i]["productpath"];

                    var rect = rects.get(i);
                    var info = frame[i].rect.split(",");

                    newLeft = (orientation == 'portrait') ? realVideoWidth/videoWidth * info[0] : (clientWidth-realVideoWidth)/2 + realVideoHeight/videoHeight * info[0] ;
                    newTop = (orientation == 'portrait') ? (clientHeight-realVideoHeight)/2 + realVideoWidth/videoWidth * info[1] : realVideoHeight/videoHeight * info[1] ;
                    newWidth = (orientation == 'portrait') ? realVideoWidth/videoWidth * info[2] : realVideoHeight/videoHeight * info[2] ;
                    newHeight = (orientation == 'portrait') ? realVideoWidth/videoWidth * info[3] : realVideoHeight/videoHeight * info[3] ;

                    if (detailBarOpen) {
                        if ((newWidth + newLeft)>=(clientWidth - 350)) {
                            return;
                        }
                    }

                    $(rect).css({
                        opacity: isShowAnnos ? 1 : 0,
                        height: newHeight,
                        width: newWidth,
                        left: newLeft,
                        top: newTop,
                        display: "block",
                        zIndex: 9999 - newWidth << 0
                    }).attr({
                            "scale-x": scaleX,
                            "scale-y": scaleY,
                            "class": "rect show",
                            "product-id": productid,
                            "product-path": productpath,
                            "onClick": ''
                        }).empty();
                }
            }

            // send GA events on 25%, 50%, 75% of movie
            if (currentTime >= (duration * 0.25) && !movieLengthGA.ga25) {
                movieLengthGA.ga25 = true;
                ga('send', 'event', 'video-' + project_id, '25% watched', 'video-' + project_id + '-timelog');
            } else if (currentTime >= (duration * 0.50) && !movieLengthGA.ga50) {
                movieLengthGA.ga50 = true;
                ga('send', 'event', 'video-' + project_id, '50% watched', 'video-' + project_id + '-timelog');
            } else if (currentTime >= (duration * 0.75) && !movieLengthGA.ga75) {
                movieLengthGA.ga75 = true;
                ga('send', 'event', 'video-' + project_id, '75% watched', 'video-' + project_id + '-timelog');
            }
        },

        twitterSend: function(){
            console.log('the end');
            var player = this, frame, frameIndex, currentTime, duration;

            var clientHeight = player.node.clientHeight || $(player.node).height() * 1;
            var clientWidth = player.node.clientWidth || $(player.node).width() * 1;
            var videoWidth = player.options.originWidth || player.node.videoWidth || clientWidth;
            var videoHeight = player.options.originHeight || player.node.videoHeight || clientHeight;

            var offsetTop = 0; offsetLeft = 0;
            // fullscreen with youtube;

            var scaleX = clientWidth / videoWidth;
            var scaleY = clientHeight / videoHeight;
            var orientation = (scaleX > scaleY) ? 'landscape' : 'portrait';

            var realVideoWidth = (orientation == 'portrait') ? clientWidth : videoWidth * scaleY,
                realVideoHeight = (orientation == 'portrait') ? videoHeight * scaleX : clientHeight;

            var newTop = 0, newLeft = 0, newWidth = 0, newHeight = 0, i = 0;
            var rects = $(".mejs-annotations .rect");

//            console.log(currentTime, duration);
            var rect = rects.get(0);
            info = [100, 175, 440, 60];

            newLeft = (orientation == 'portrait') ? realVideoWidth/videoWidth * info[0] : (clientWidth-realVideoWidth)/2 + realVideoHeight/videoHeight * info[0] ;
            newTop = (orientation == 'portrait') ? (clientHeight-realVideoHeight)/2 + realVideoWidth/videoWidth * info[1] : realVideoHeight/videoHeight * info[1] ;
            newWidth = (orientation == 'portrait') ? realVideoWidth/videoWidth * info[2] : realVideoHeight/videoHeight * info[2] ;
            newHeight = (orientation == 'portrait') ? realVideoWidth/videoWidth * info[3] : realVideoHeight/videoHeight * info[3] ;

            if (detailBarOpen) {
                if ((newWidth + newLeft)>=(clientWidth - 350)) {
                    return;
                }
            }

            $(rect).css({
                height: newHeight,
                width: newWidth,
                left: newLeft,
                top: newTop,
                display: 'block',
//                border: '1px solid white',
                cursor: 'pointer'
            }).removeAttr('product-id').html('<div class="tweetToUs">TWEET TO US!</div>')
                .attr('onClick', "window.open('https://twitter.com/intent/tweet?hashtags=SOCALSTYLIST&text=TEXT&url=URL', '_blank');");
//            click the hashtag to tweet
            UIControl.fireEvent('change-guide',  'Click the hashtag to tweet.');
        }
    });

})(mejs.$);