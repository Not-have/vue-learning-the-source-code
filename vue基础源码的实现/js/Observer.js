/**
 * 查看新旧值  是否有变化
 * 需要  在处理事件的时候
 */
class Watcher {
    constructor (vm, expr, cb) {
        this.vm = vm;
        this.expr = expr;
        this.cb = cb;
        // 先把旧值保存起来
        this.oldVal = this.getOldVal ();
    }
    
    updata () {
        const newVal = compileUtil.getVal (this.expr, this.vm);
        if (newVal !== this.oldVal) {
            this.cb (newVal);
        }
    }
    
    getOldVal () {
        Dep.target = this;
        const oldVal = compileUtil.getVal (this.expr, this.vm);
        Dep.target = null;
        return oldVal;
    }
}
class Dep {
    constructor () {
        this.subs = [];
    }
    
    // 收集观察者
    addSub (watcher) {
        this.subs.push (watcher);
    }
    
    // 通知观察者 去更新
    notify () {
        // console.log ("观察者",this.subs);
        this.subs.forEach (w => w.updata ());
    }
}
class Observer {
    constructor (data) {
        this.observe (data)
    }
    
    observe (data) {
        if (data && typeof data === "object") {
            // console.log (Object.keys(data));
            Object.keys (data).forEach (item => {
                // console.log (item);
                this.defineReactive (data, item, data[item]);
            })
        }
    }
    
    defineReactive (obj, key, value) {
        //在这 要是有下一层的话，就要 递归便利
        this.observe (value);
        const dep = new Dep ();
        // 劫持并监听 所有的属性
        Object.defineProperty (obj, key, {
            enumerable: true,
            configurable: false,
            get () {
                // 初始化
                // 订阅数据变化  往Dep中添加观察者
                Dep.target && dep.addSub (Dep.target);
                return value;
            },
            set: (newVal) => {
                this.observe (newVal);
                if (newVal !== value) {
                    value = newVal;
                }
                // 告诉Dep的变化
                dep.notify ();
            }
        })
    }
}
