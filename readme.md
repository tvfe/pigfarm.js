# 配置化页面输出

对于大部分渲染页面的需求，可以归结为以下模型：

1. 根据url参数向后台请求有关的数据
2. 将数据丢到模版引擎上得到html

pigfarm.js就是完成这种职责的的一个模块

```
var pigfarm = require('pigfarm.js');

var app = pigfarm({
    render: function(data) {
        console.log(data.index); // 腾讯视频首页内容;
        return `eat ${data.title.food}`
    },
    data: {
        title: {
            type: "static",
            value: {
                "food": "cabbage"
            }
        },
        index: {
            type: "request",
            action: {
                url: "http://v.qq.com",
                fixAfter: function (data) {
                    return data;
                }
            }
        }
    }
});

console.log(await app()) // 输出 'eat cabbage'
```
其中，type=request的数据源，action内的配置即[pigfarm-fetcher](https://github.com/tvfe/pigfarm-fetcher)的配置方式。这让你可以获取任意的数据。