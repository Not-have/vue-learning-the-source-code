const compileUtil = {
    getVal (expr, vm) {
        return expr.split (".").reduce ((data, currentVal) => {
            return data[currentVal];
        }, vm.$data);
    },
    setVal (expr, vm, inputVal) {
        return expr.split (".").reduce ((data, currentVal) => {
            data[currentVal] = inputVal;
        }, vm.$data);
    },
    getContentVal (expr, vm) {
        return expr.replace (/\{\{(.+?)\}\}/g, (...args) => {
            return this.getVal (args[1], vm);
        });
    },
    /**
     * @param node 便利出来的标签  字符串
     * @param expr 是data数据的 键
     * @param vm
     */
    text (node, expr, vm) {
        let value;
        //  处理双大括号
        if (expr.indexOf ("{{") !== -1) {
            value = expr.replace (/\{\{(.+?)\}\}/g, (...args) => {
                // 绑定观察者，将来 数据变化，触发这里的回调 进行更新
                new Watcher (vm, args[1], (newVal) => {
                    this.update.textUpdater (node, this.getContentVal (expr, vm));
                })
                return this.getVal (args[1], vm);
            });
        } else {
            value = this.getVal (expr, vm);
        }
        this.update.textUpdater (node, value);
    },
    html (node, expr, vm) {
        const value = this.getVal (expr, vm);
        new Watcher (vm, expr, (newVal) => {
            this.update.htmlUpdata (node, newVal);
        })
        this.update.htmlUpdata (node, value);
    },
    model (node, expr, vm) {
        const value = this.getVal (expr, vm);
        // 绑定更新函数 数据 => 视图
        new Watcher (vm, expr, (newVal) => {
            this.update.modelUpdata (node, newVal);
        })
        // 视图 => 数据 => 视图
        node.addEventListener ("input", (e) => {
            //设置值 (只适用于输入框)
            this.setVal (expr, vm, e.target.value);
        })
        this.update.modelUpdata (node, value);
    },
    on (node, expr, vm, eventName) {
        let fn = vm.$options.methods && vm.$options.methods[expr];
        // 在下面  要把这个fn回调回去
        node.addEventListener (eventName, fn.bind (vm), false);
    },
    bind (node, expr, vm, attrName) {
    
    },
    // 更新的函数
    update: {
        textUpdater (node, value) {
            //textContent 是对文本  赋值
            node.textContent = value;
        },
        htmlUpdata (node, value) {
            node.innerHTML = value;
        },
        modelUpdata (node, value) {
            node.value = value;
        }
    }
}

class Compile {
    constructor (el, vm) {
        // 判断el否为节点对象
        this.el = this.isElementNode (el) ? el : document.querySelector (el);
        // console.log(this.el);
        this.vm = vm;
        // 1、获取文档碎片对象，减少回流和重绘吧所有子节点  追加进去
        const fragment = this.node2Fragment (this.el);
        // console.log (fragment);
        // 2、编译模板
        this.compile (fragment);
        // 3、追加子元素到根节点中去
        this.el.appendChild (fragment);
    }
    
    /*
     <h2>{{person.name}}——————{{person.age}}</h2>
     <h3>{{person.fav}}</h3>
     <ul>
     <li>1</li>
     <li>2</li>
     <li>3</li>
     </ul>
     <h3>{{msg}}</h3>
     <div v-text="msg"></div>
     <input type="text" v-model="msg">
     */
    compile (fragment) {
        // 1、获取子节点
        const chinNodes = fragment.childNodes;
        [...chinNodes].forEach (item => {
            // console.log (item)
            if (this.isElementNode (item)) {
                // 是元素节点（是元素节点，就要去编译）
                // console.log (item);
                this.compileElement (item);
            } else {
                // 文本节点
                // console.log (item);
                this.compileText (item);
            }
            // 再这判断他的  子节点还有子元素 和 长度的时候，进行递归
            if (item.childNodes && item.childNodes.length) {
                this.compile (item);
            }
        })
    }
    
    /**
     * 这个是编译元素
     * @param node 标签
     */
    compileElement (node) {
        // console.log (node);
        const attributes = node.attributes;
        // console.log (attributes);
        [...attributes].forEach (attr => {
            // console.log (attr);
            // 进行结构赋值
            const {name, value} = attr;
            // console.log (name);
            // console.log (value);
            if (this.isDirective (name)) {//是的话  就是一个指令 v-text  v-html  v-model  v-on:click
                const [, dirctive] = name.split (("-")); //text  html  model  on:click
                // 在这  在对 事件进行分割
                dirctive.split (":");
                const [dirName, eventName] = dirctive.split (":");//text  html  model  on  这块会自动 走到上面去
                // 下面 这块是数据 驱动视图
                compileUtil[dirName] (node, value, this.vm, eventName);
                // 删除标签里面的指令
                node.removeAttribute ("v-" + dirctive);
            } else if (this.isEventName (name)) {
                let [, eventName] = name.split ("@");
                compileUtil["on"] (node, value, this.vm, eventName);
            }
        })
    }
    
    /**
     * 编译文本
     * @param node 文本
     */
    compileText (node) {
        const content = node.textContent;
        if (/\{\{(.+?)\}\}/.test (content)) {
            compileUtil["text"] (node, content, this.vm);
        }
    }
    
    isEventName (event) {
        return event.startsWith ("@");
    }
    
    isDirective (attrName) {
        //这块判断是否是v- 开头的
        return attrName.startsWith ("v-");
    }
    
    node2Fragment (el) {
        const f = document.createDocumentFragment ();
        let firstChild;
        //把他给他，如果 为真  就存在 文档对象
        while (firstChild = el.firstChild) {
            f.appendChild (firstChild);
        }
        return f;
    }
    
    isElementNode (node) {
        // 表示他是一个元素的节点对象
        return node.nodeType === 1;
    }
}
class Vue {
    constructor (options) {
        const {el, data} = options;
        this.$el = el;
        this.$data = data;
        this.$options = options;
        if (this.$el) {
            // 1、实现一个数据观察者
            new Observer (this.$data);
            // 2、实现一个指令解析器
            new Compile (this.$el, this);
            // 代理
            this.proxyData (this.$data);
        }
    }
    
    proxyData (data) {
        for (const key in data) {
            Object.defineProperty (this, key, {
                get () {
                    return data[key];
                },
                set (newVal) {
                    data[key] = newVal;
                }
            })
        }
    }
}
