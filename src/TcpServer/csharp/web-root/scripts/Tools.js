function Tools() {
    var self = this;

    self.prompt = function (message, defaultValue) {
        var ret = window.prompt(JSON.stringify(message || "{}"), defaultValue || "");
        if (ret && ret.trim() !== "") {
            return ret;
        }
        return undefined;
    };
    self.setImmediate = function (func, args) {
        if (func) {
            if (window.setImmediate) {
                window.setImmediate(func, args);
            } else {
                func.apply(this, args);
            }
        }
    };
    self.log = function (message) {
        if (console.log) {
            console.log(message);
        }
    }
    self.error = function (message) {
        if (console.error) {
            console.error(message);
        }
    }
    self.bindEvent = function (element, type, handler) {
        if (element.addEventListener) {
            element.addEventListener(type, handler, false);
        } else {
            element.attachEvent('on' + type, handler);
        }
    }

    self.spin = function (block, delay) {
        if (block) { // set this to true to simulate delay
            var waitTill = new Date(new Date().getTime() + 1000 * delay);
            var last = 0;
            while (waitTill > new Date()) {
                var next = new Date().getSeconds();
                if (last != next) {
                    console.log("Waiting!!! " + last);
                    last = next;
                }
            }
        }
    }
    self.getFunctionArguments = function (func) {
        var args = [];
        var symbols = func.toString();
        var start = symbols.indexOf('function');
        if (start !== 0 && start !== 1) throw new Error("invalid input");
        start = symbols.indexOf('(', start);
        var end = symbols.indexOf(')', start);
        var params = symbols.substr(start + 1, end - start - 1).split(',');
        for (var i in params) {
            var argument = params[i];
            args.push(argument);
        }
        return args;
    }

    return self;
}
var tools = window.tools = window.tools || new Tools();

//Function.prototype.getArguments = function () {
//    var func = this;
//    var symbols = func.toString(),
//            start, end, register;
//    start = symbols.indexOf('function');
//    if (start !== 0 && start !== 1) return undefined;
//    start = symbols.indexOf('(', start);
//    end = symbols.indexOf(')', start);
//    var args = [];
//    symbols.substr(start + 1, end - start - 1).split(',').forEach(function (argument) {
//        args.push(argument);
//    });
//    return args;
//}
//Object.prototype.getFunctionNames = function () {
//    var res = [];
//    for (var k in this) {
//        var i = this[k];
//        if (typeof i === 'function') {
//            res.push(k);
//        }
//    }
//    return res;
//};

String.prototype.endsWith = function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};