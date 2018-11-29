class Promise {
    constructor(executor) {
        this.status = 'pending'
        this.value = undefined;
        this.reason = undefined;
        this.onResolvedCallbacks = [];
        this.onRejectedCallbacks = [];
        // 只有状态是pending 参能进行状态的转化
        let resolve =(value) => {
            if(this.status === 'pending'){
                this.value = value;
                this.status = 'fulfilled';
                this.onResolvedCallbacks.forEach(fn =>fn());
            }
        }
        let reject = (reason) => {
            if(this.status === 'pending'){
                this.reason = reason;
                this.status = 'rejected';
                this.onRejectedCallbacks.forEach(fn =>fn())
            }
        }
        try{
            executor(resolve, reject); // 如果执行这个executor执行时候抛出异常 应该走下一个then的失败
        }catch(e){
            reject(e);// 出错了 reason就是错误
        }
    }

    then = (onFulfilled, onRejected) =>{
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled:(data)=>data;
        onRejected = typeof onRejected === 'function' ? onRejected: (err) =>{
          throw err;
        }
        let promise2; // 这个promise2 就是我们每次调用then后返回的新的promise
        // 实现链式调用主要的靠的就是这个promise
        promise2 = new Promise((resolve,reject) =>{
          if (this.status === 'fulfilled') {
            // 这个返回值是成功函数的执行结果
            setTimeout(() => {
              try{
                let x = onFulfilled(this.value);
                // 判断promise2 和 x 也是then函数返回的结果和promise2的关系 如果x 是普通值 那就让promise2成功 如果 是一个失败的promise那就让promise2 失败
                resolvePromise(promise2, x, resolve, reject);
              }catch(e){
                reject(e);
              }
            }, 0);
          }
          if (this.status === 'rejected') {
            setTimeout(() => {
              try{
                let x = onRejected(this.reason);
                resolvePromise(promise2, x, resolve, reject);
              }catch(e){
                reject(e)
              }
            },0)
          }
          if (this.status === 'pending') {
            // 默认当前 new Promise  executor中是有异步的
            this.onResolvedCallbacks.push( () =>{
              setTimeout(() => {
                try{
                  let x = onFulfilled(this.value);
                  resolvePromise(promise2, x, resolve, reject);
                }catch(e){
                  reject(e)
                }
              }, 0);
            });
            this.onRejectedCallbacks.push(() =>{
              setTimeout(() => {
                try{
                  let x = onRejected(this.reason);
                  resolvePromise(promise2, x, resolve, reject);
                }catch(e){
                  reject(e);
                }
              }, 0);
            })
          }
        });
        return promise2;
        
    }
      // npm install promises-aplus-tests -g
      catch = (onRejected) =>{
        return this.then(null, onRejected);
      }
      // finally 也是then的一个简写
      finally = (cb) =>{
        // 无论成功还是失败 都要执行cb 并且把成功或者失败的值向下传递
        return this.then( (data) =>{
          cb();
          return data;
        }, (err) =>{
          cb();
          throw err;
        });
      }

      // 类调用的都叫静态方法
  static reject(reason) {
    return new Promise((resolve, reject) =>{
      reject(reason);
    })
  }
  static resolve(value) {
    return new Promise((resolve, reject) =>{
      resolve(value);
    })
  }
  static all(promises) {
    return new Promise((resolve, reject) =>{
      let arr = [];
      // 处理数据的方法
      let i = 0;
      function processData(index, data) {
        arr[index] = data; //数组的索引和长度的关系
        if (++i === promises.length) { // 当数组的长度 和promise的个数相等时 说明所有的promise都执行完成了
          resolve(arr);
        }
      }
      for (let i = 0; i < promises.length; i++) {
        let promise = promises[i];
        if (typeof promise.then == 'function') {
          promise.then((data) =>{
            processData(i, data); // 把索引和数据 对应起来 方便使用
          }, reject)
        } else {
          processData(i, promise);
        }
      }
    });
  }
  static race(promises) {
    return new Promise((resolve, reject) =>{
      for (let i = 0; i < promises.length; i++) {
        let promise = promises[i];
        if (typeof promise.then == 'function') {
          promise.then(resolve, reject)
        } else {
          resolve(promise);
        }
      }
    })
  }

}
// 核心方法 处理 成功或者失败执行的返回值 和promise2的关系
function resolvePromise(promise2,x,resolve,reject) {
    // 这个处理函数 需要处理的逻辑韩式很复杂的
    // 有可能这个x 是一个promise  但是这个promise并不是我自己的
    if(promise2 === x){
        return reject(new TypeError('TypeError: Chaining cycle detected for promise #<Promise>'))
    }
    // 不单单需要考虑自己 还要考虑 有可能是别人的promise
    let called; // 文档要求 一旦成功了 不能调用失败
    if((x!=null&&typeof x=== 'object') || typeof x === 'function'){
        // 这样只能说 x 可能是一个promise
        try{
        // x = {then:function(){}}
        let then = x.then; // 取then方法
        if(typeof then === 'function'){
            then.call(x,(y) =>{ // resolve(new Promise)
            if(!called){called = true;} else{ return;}
            resolvePromise(x,y,resolve,reject); //  递归检查promise
            },(r) =>{
            if (!called) { called = true; } else { return; }
            reject(r);
            });
        }else{ // then方法不存在
            resolve(x); // 普通值
        }
        }catch(e){ // 如果取then方法出错了，就走失败
        if (!called) { called = true; } else { return; }
        reject(e);
        }
    }else{
        resolve(x);
    }
}
Promise.deferred = Promise.defer = function () {
    let dfd = {};
    dfd.promise = new Promise((resolve,reject)=>{
        dfd.resolve = resolve;
        dfd.reject = reject;
    })
    return dfd
}
module.exports = Promise;