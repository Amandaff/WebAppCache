WebAppCache
===========

WebApp Cache Using localStorage(SessionStorage)  
intro：http://www.zawaliang.com/2013/04/277.html



[如何使用]
----------------------
基本只需要两步：  
1. 按格式定义app.json  
2. 定义入口文件（如app.html）


[Demo]
----------------------
目录结构如下：  
WebAppCache约定app.html与app.json处于相同的目录层级，其他的资源不作要求。
```
app/--
 |---app.manifest
 |---app.json
 |---app.html
 |---WebAppCache.js
 |---page/
       |---index.html
       |---inner/
             |---demo.html  
 |---js/
       |---zepto.min.js
       |---touch.min.js
       |---app.js
       |---demo.js
 |---css/
       |---global.css
       |---inner/
             |---demo.css
```


app.json应用配置文件

```
{
	// 配置文件过期时间(分钟)
  	"expire": "10",
  	// 核心加载的js文件
	"jsCore": ["app"],
	// 核心加载的css文件
	"cssCore": ["app"],
	// js配置
	"jsConfig": {
		// js基准路径
		"path": "demo/js/",
		// js缺省后缀
		"suffix": ".js"
	},
	// css配置
	"cssConfig": {
		// css基准路径
		"path": "demo/css/",
		// css缺省后缀
		"suffix": ".css"
	},
	// 页面配置
	"pageConfig": {
		// 页面基准路径
		"path": "demo/",
		// 页面缺省后缀
		"suffix": ".html"
	},
	// 声明应用js资源
	"js": {
		"app": {
			// 指定拉取路径,url为空时以基准路径+模块名拉取+缺省后缀
			"url": "demo/js/app.js",
			// 版本号,-1时不作缓存
			"v": "1.0.0"
		},
		"demo": {
			"url": "demo/js/demo.js",
			"v": "1.0.0"
		}
	},
	// 声明应用css资源
	"css": {
		"app": {
			"url": "demo/css/app.css",
			"v": "1.0.0"
		},
		"demo": {
			"url": "demo/css/demo.css",
			"v": "1.0.0"
		}
	},
	// 声明应用页面
	"page": {
		"demo": {
			"v": "1.0.0",
			// 声明除去核心加载外需要加载的资源
      			"js": ["demo"],
			"css": ["demo"]
		}
	}
}
```

app.html缓存调度
```
<!DOCTYPE html>
<html manifest="/app/app.manifest">
<head>
<title></title>
<meta charset="utf-8">
<script type="text/javascript" src="/app/WebAppCache.js"></script>
</head>
<body>
</body>
</html>
```

实际请求地址如下：
```
demo/demo.html  -> app/app.html?v=demo
```

一些注意事项  
1. app.html?v=xxx中缺省为v=index  
2. 核心css资源于所有其他css资源前渲染  
3. 由于document.write对脚本中的script敏感，WebAppCache采取动态生成脚本执行的方式，这就可能造成页面中的脚本于缓存中的脚本前执行的问题。所以对于依赖app.json中声明的js的脚本，建议通过配置到app.json里处理来解决，这个问题后续优化解决。