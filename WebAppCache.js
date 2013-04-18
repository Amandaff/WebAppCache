/**
 * WebAppCache v1.0.0
 * 2013, zawa, www.zawaliang.com
 * Licensed under the MIT license.
 */

;(function(window, document) {

        var _local = window.localStorage,
        _session = window.sessionStorage,
        _pathname = window.location.pathname
        _appName = _pathname, // App标识
        _fireQueue = [], // 最终需要执行的队列
        _onload = false,
        _renderReady = false,
        _cache = {}, 
        _storage = null;


    function getParam(name) {
        var p = '&' + window.location.search.substr(1) + '&',
            re = new RegExp('&' + name + '=([^&]*)&'),
            r = p.match(re);

        return r ? r[1] : '';
    }

    function get(url, callback, errorHandler) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                var status = xhr.status;
                if ((status >= 200 && status < 300) || status == 304) {
                    callback.call(null, xhr.responseText);
                } else {
                    var msg = status ? 'Error:' + status : 'Abort';
                    (getType(errorHandler) == 'function') ? 
                        errorHandler(status, msg) : alert(msg);
                }
            }
        };
        xhr.open('get', url, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send(null);
    }

    /**
     * 数据类型
     * @param {*} o
     * @return {String} string|array|object|function|number|boolean|null|undefined
     */
    function getType(o) {
        var t = typeof(o);
        return (t == 'object' ? Object.prototype.toString.call(o).slice(8, -1) : t).toLowerCase();
    }
    
    function each(item, callback) {
        if (getType(item) == 'array') {
             for (var i = 0, len = item.length; i < len; i++) {
                callback.apply(null, [i, item[i]]);
            }
        } else {
            for (var k in item) {
                if (item.hasOwnProperty(k)) {
                     callback.apply(null, [k, item[k]]);
                }
            }
        }
    }

    function inArray(item, arr) {
       for (var i = 0, len = arr.length; i < len; i++) {
            if (arr[i] === item) {
                return i;
            }
        };
        return -1;
    }

    /**
     * 优化的缓存设置, 溢出捕获以及队列管理
     */
    function cache(n, v, prefix) {
        prefix = (getType(prefix) == 'string') ? prefix : _appName;
        if (getType(v) == 'undefined') {
            var r = _storage.getItem(prefix + n);

            if (r === null) {
                return r;
            }

            try {
                return JSON.parse(r);
            } catch (e) {
                return r;
            }
        }
        
        //  缓存当前应用的写操作key值(无序)
        if (prefix == _appName) {
            var cacheKey = cache('CacheKey') || [];
            cacheKey.push(n);
            cacheKey = uniq(cacheKey);
            _storage.setItem(_appName + 'CacheKey', JSON.stringify(cacheKey));
        }

        if (getType(v) != 'string') {
            v = JSON.stringify(v);
        }

        try {
            _storage.setItem(prefix + n, v);
        } catch (e) {
            var appName = shiftAppCache();
            
            if (appName !== false) { // 重新尝试缓存
                cache(n, v);
            } else { // 没有应用缓存可供删除时, 淘汰当前应用队列
                var cq = cache('Core') || [],
                    sq = sourceQueue();

                // 将Core与Source资源合并进行队列管理
                sq = sq.concat(cq);

                // 缓存区不足时,淘汰当前应用缓存重新发起请求
                if (sq.length < 1) {
                    clearAppCache(_appName);
                    window.location.reload(false);
                    return;
                }

                var item = sq.shift(),
                    key = _appName + item;

                // 删除最早的缓存
                _storage.removeItem(key); 
                _storage.removeItem(key + '.Version');
                // 更新队列
                sourceQueue(sq);
                // 重新尝试缓存
                cache(n, v);
            }
        }
    }

    /**
     * 清空应用缓存
     */
    function clearAppCache(appName) {
        var cacheKey = cache('CacheKey', undefined, appName) || [];
        each(cacheKey, function(k, v) {
            _storage.removeItem(appName + v);
        });
        _storage.removeItem(appName + 'CacheKey');
    }

    /**
     * 按应用缓存队列清空应用缓存(跳过当前应用缓存)
     */
    function shiftAppCache() {
        var appQueue = cache('App.Queue', undefined, '') || [];
        appQueue = arrDel(_appName, appQueue); // 跳过当前应用缓存

        if (appQueue.length > 0) {
           var appName = appQueue.shift();
            clearAppCache(appName);
            cache('App.Queue', appQueue, '');
            return appName
        }
        return false;
    }

    /**
     * 缓存非核心资源队列
     */
    function sourceQueue(sq) {
        return (getType(sq) != 'undefined') ? cache('Source', sq)
            : cache('Source') || [];
    }

    /**
     * 格式化配置
     */
    function formatAppConf(conf) {
        var source = {};

        each(['js', 'css', 'page'], function(k, v) {
            conf[v] && each(conf[v], function(k2, v2) {
                var name = v + '_' + k2;
                v2.__name__ = k2;
                v2.__type__ = v;
                v2.v = v2.v || ''; // 版本号缺省为空
                source[name] = v2;
            });
            // 删除格式化后的js css page配置
            conf[v] = null;
            delete conf[v];
        });
        conf.__source__ = source;
        return conf;
    }


    function concatArr(arr, type) {
        each(arr, function(k, v) {
            arr[k] = type + v;
        });
        return arr;
    }

    /**
     * 删除数组某项
     */
    function arrDel(n, arr) {
        var i = inArray(n, arr);
        if (i != -1) {
            arr.splice(i, 1);
        }
        return arr;
    }

    /**
     * 去重
     */
    function uniq(arr) {
        var hash = {},
            r = [];

        each(arr, function(k, v) {
            if (!hash[v]) {
                r.push(v);
                hash[v] = 1;
            }
        });
        return r;
    }

    /**
     * 队列去重与依赖处理
     */
    function getFireQueue(jsQueue, cssQueue, config) {
        jsQueue = concatArr(jsQueue, 'js_');
        cssQueue = concatArr(cssQueue, 'css_');

        // 去重
        jsQueue = uniq(jsQueue);
        cssQueue = uniq(cssQueue);

        // TODO: 依赖管理(暂时按数组顺序加载)

        // 保持css队列在前, 提升后续开始加载时间
        return cssQueue.concat(jsQueue);
    }


    /**
     * 获取资源路径
     */
    function getPath(config, c) {
        if (c.url) {
            return c.url;
        }

        var conf = config[c.__type__ + 'Config'] || {};
        return conf.path + c.__name__.replace(/\./g, '/') + conf.suffix;
    }

    /**
     * 更新队列
     */
    function updateQueue(queue) {
        var config = _cache['Config'],
            source = config.__source__,
            cq = cache('Core') || [],
            sq = sourceQueue(),
            len =  queue.length,
            loaded = 0;

        // 并行加载资源
        each(queue, function(k, v) {
            var s = source[v],
                path = getPath(config, s),
                url = path + '?_=' + (s.v == -1 ? (+new Date()) : s.v);

            get(url, (function(n, c) {
                return function(data) {
                    // 1) 核心资源不计入Source队列
                    // 2) 非缓存资源不计入Source队列
                    if (inArray(n, cq) == -1 && c.v != -1) {
                        // 若缓存中已存在n的资源,则更新其队列位置
                        if (inArray(n, sq) != -1) {
                            sq = arrDel(n, sq);
                        }

                        sq.push(n);
                    }

                    // 缓存时方存储
                    if (c.v != -1) {
                        cache(n, data);
                        cache(n + '.Version', c.v);  
                    }
                    
                    _cache[n] = data;
                    loaded++;

                    if (loaded == len) {
                        //  按添加时间缓存队列
                        sourceQueue(sq);

                        render();
                    }
                };
            })(v, s));
        });
    }

    /**
     * 版本比较
     */
    function cmpVersion(config) {
        var view = 'page_' + getParam('v'), // 加载的视图
            source = config.__source__,
            view = source[view] ? view : 'page_index',
            c = source[view] || {},
            jsCore = config.jsCore || [],
            cssCore = config.cssCore || [],
            jsQueue = jsCore.concat(c.js || []),
            cssQueue = cssCore.concat(c.css || []);

        _fireQueue = getFireQueue(jsQueue, cssQueue, config);
        _fireQueue.push(view);

        // 缓存核心资源队列(按依赖权重升序排列,css在前,js在后, 用于缓存队列管理)
        var core = [];
        core[0] = concatArr(cssCore, 'css_').reverse();
        core[1] = concatArr(jsCore, 'js_').reverse();
        core = core[0].concat(core[1]);
        cache('Core', core);

         // 检查资源是否需要更新
        var udQueue = [];
        each(_fireQueue, function(k, v) {
            _cache[v] = cache(v);


            if (source[v].v == -1 // 不需缓存
                || _cache[v] === null  // 本地不存在v的缓存
                || cache(v + '.Version') != source[v].v // 有新版本
                ) {

                udQueue.push(v);
            }
        }); 

        if (udQueue.length > 0) {  // 有更新队列
            updateQueue(udQueue);
        } else { // 版本没变化
            render();
        }
    }

    var appendJs = function(head, text) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.text = text;
        head.appendChild(script);
    };

    /**
      * 检查是否可渲染
      */
    function render() {
        _renderReady = true;
        if (_onload) {
            goRender();
        }
    }

    /**
     * 页面渲染
     */
    function goRender() {
        var config = _cache['Config'],
            source = config.__source__ || {},
            arrText = {};

        each(_fireQueue, function(k, v) {
            var type = source[v].__type__;
            if (!arrText[type]) {
                arrText[type] = [];
            }
            arrText[type].push(_cache[v] || '');
        });

        var page =  arrText.page.join('');

        // css优先于页面其他样式渲染
        var css = '<style type="text/css">' + arrText.css.join('\n') + '<\/style>\n',
            hp = page.indexOf('</head>'),
            match = page.match(/<style(?:\s.*)?>/),
            p = match ? Math.min(page.indexOf(match[0]), hp) : hp;

        page = page.substr(0, p) + css + page.substr(p);


        // document.write script的方式,对内容汇总含script的脚本比较敏感,容易出问题,因此不适用此方式插入脚本
        // var js = '\x3Cscript type="text/javascript">' + arrText.js.join(';\n') + '\x3C/script>\n';
        //     hp = page.indexOf('</head>'),
        //     match = page.match(/<script(?:\s.*)?>/),
        //     p = match ? Math.min(page.indexOf(match[0]), hp) : hp;

        // page = page.substr(0, p) + js + page.substr(p);

        // 写入文档流
        document.open('text/html', 'replace'); // replace: 新建的文档会覆盖当前页面的文档（清空原文档里的所有元素，浏览器的后退按钮不可用）；
        document.write(page);
        document.close();

        var head = document.getElementsByTagName('head')[0];

        // js
        arrText.js = arrText.js.join(';');
        appendJs(head, arrText.js);
       
        // 锚点处理
        // var offsetTop = location.hash ? $('a[name="' + location.hash.substr(1) + '"]').position().top : 1;
        // setTimeout(function() {
        //     window.scrollTo(0, offsetTop);
        // }, 100);

        arrText = page = js = css = null;

        // 清空标记位
        _onload = _renderReady = false;
    }

    function init() {
        var localStorageEnabled = false;
        if (!!_local) {
            // 检测webview是否开启localStorage
            var key = _appName + 'CacheEnabled';
            _local.setItem(key, 1);
            localStorageEnabled = (_local.getItem(key) == 1);
            localStorageEnabled && _local.removeItem(key);
        }

        // 缓存，不支持localStorage的使用sessionStorage替代，此时使用304缓存方案
        _storage = localStorageEnabled ? _local : _session


        // 缓存App队列,方便溢出时管理
        var appQueue = cache('App.Queue', undefined, '') || [];
        // 按使用时间更新App队列顺序
        if (inArray(_appName, appQueue) != -1) {
            appQueue = arrDel(_appName, appQueue);
        } 
        appQueue.push(_appName);
        cache('App.Queue', appQueue, '');


        // App.Config有效期检查
        var config = cache('Config'),
            expire = cache('Config.Expire'),
            updateConfig = false;

        _cache['Config'] = config;

        // 离线情况下,直接渲染输出
        if (!navigator.onLine) {
             render();
             return;
        }


        if (config && expire) {
            var now = +new Date();
            if ((now - expire.time) / (1000 * 60) > expire.expire) {
                updateConfig = true;
            }
        } else {
            updateConfig = true;
        }

        if (updateConfig) {
            var path = _pathname.substring(0, _pathname.lastIndexOf('/')+1),
                jsonFile = path + 'app.json';

            get(jsonFile + '?_='  + (+new Date()), function(data) {
                data = formatAppConf(JSON.parse(data));
                cache('Config', data);
                cache('Config.Expire', {
                    time: +new Date(),
                    expire: data.expire
                });
                _cache['Config'] = data;
                cmpVersion(data);
            });
        } else {
            cmpVersion(config);
        }   
    }


    // document.write在window.onload(非DOMContentLoaded)完毕后方可覆盖原文档
    window.addEventListener('load', function() {
        _onload = true;
        if (_renderReady) {
            goRender();
        }
    });

    init();

})(window, document, undefined);
