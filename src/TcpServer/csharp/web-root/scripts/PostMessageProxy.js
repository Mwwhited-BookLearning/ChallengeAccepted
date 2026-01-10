function GetFunctionDefintions(obj) {
    var funcs = {};
    for (var funcName in obj) {
        var func = obj[funcName];
        if (typeof func === 'function') {
            var args = [];

            var symbols = func.toString();
            var start = symbols.indexOf('function');
            if (start !== 0 && start !== 1) continue;
            start = symbols.indexOf('(', start);
            var end = symbols.indexOf(')', start);
            var params = symbols.substr(start + 1, end - start - 1).split(',');
            for (var i in params) {
                var argument = params[i];
                args.push(argument);
            }

            funcs[funcName] = args;
        }
    }
    return funcs;
}

function WindowAdaper(proxy, clientUrl) {
    var prv = {
        element: proxy,
        ClientURL: clientUrl
    };
    var adapter = {
        postMessage: function (message, targetOrigin, ports) {
            var target = prv.element;
            try {
                if (target && !target.closed) {
                    target.postMessage(message, targetOrigin, ports || null);
                }
            } catch (ex) {
                console.error({
                    method: 'WindowAdaper.postMessage',
                    proxy: target,
                    message: message,
                    exception: ex
                });
            }
        },
        compare: function (pxy) {
            return pxy == prv.element;
        }
    };

    adapter.__defineGetter__('closed', function () {
        try {
            if (prv.element) {
                return prv.element.closed;
            }
        } catch (ex) {
            console.error('WindowAdaper.closed Error', ex);
        }
        return true; //default the adapter to closed so the proxy will open a new connection later
    });
    adapter.__defineGetter__('targetUrl', function () { return prv.ClientURL; });

    return adapter;
}

var PostMessageProxy = window.PostMessageProxy = function PostMessageProxy(
    /*string*/applicationName,
    /*object[operation]=function(arguments)*/ callbackController,
    /*object[clientName]='URL'*/clientUrls) {
    /// <signature>
    ///     <summary>PostMessageProxy</summary>
    ///     <param name="applicationName" type="string">Application Name</param>
    ///     <param name="callbackController" type="string">Controller Instance</param>
    ///     <param name="clientUrls" type="{ 'Client':'Url', ... }">client references</param>
    ///     <returns type="PostMessageProxy">PostMessageProxy</returns>
    /// </signature>

    var prv = {
        Application: applicationName,
        ClientUrls: clientUrls,
        Clients: {},
        ClientDefs: {},
        MyDef: GetFunctionDefintions(callbackController),
        PendingClients: {},
        SendMessages: {},
        Controller: callbackController,
        OnReceived: undefined,
        OnSent: undefined,
        LastSentID: 0,
        TimeOutSeconds: 10,
        MessageBuilder: function (
            /*string*/ targetApplication,
            /*string*/operation,
            /*object[]*/ args,
            /*object, optional*/ result,
            /*int, optional*/ previousMessageID,
            /*bool, optional*/ previousHandled,
            /*string, optional*/ sendOnBehalfOf,
            /*int, optional*/ sendOnBehalfOfID) {

            var message = {
                Source: prv.Application,
                Target: targetApplication,
                BehalfOf: sendOnBehalfOf,
                BehalfOfID: sendOnBehalfOfID,
                Operation: operation,
                Arguments: args,
                MessageID: prv.LastSentID++,
                CorrID: previousMessageID,
                Result: result,
                Handled: previousHandled
            };
            return message;
        },
        SystemHandlers: {
            ApplicationReady: function (clients) {
                var source = this;

                for (var clientName in clients) {
                    //don't add self
                    if (clientName == prv.Application) continue;
                    
                    var existingClient = prv.Clients[clientName];
                    //already bound 
                    if (existingClient && !existingClient.closed) continue;

                    // add proxy clients
                    prv.Clients[clientName] = source;
                }

                for (var clientName in prv.Clients) {
                    if (clients[clientName]) continue //already checked

                    var client = prv.Clients[clientName];
                    if (client && client.closed) {
                        // remove if not longer active
                        delete prv.Clients[clientName];
                    }
                }

                //ensure that self did not get added
                delete prv.Clients[prv.Application];
            },
            ApplicationReady_Response: function (clients) {

                var source = this;

                for (var clientName in clients) {
                    //don't add self
                    if (clientName == prv.Application) continue;
                    
                    var existingClient = prv.Clients[clientName];
                    //already bound 
                    if (existingClient && !existingClient.closed) continue;

                    // add proxy clients
                    prv.Clients[clientName] = source;
                }

                for (var clientName in prv.Clients) {
                    if (clients[clientName]) continue //already checked

                    var client = prv.Clients[clientName];
                    if (client && client.closed) {
                        // remove if not longer active
                        delete prv.Clients[clientName];
                    }
                }

                //ensure that self did not get added
                delete prv.Clients[prv.Application];
            },
            ApplicationLoaded: function () {
                return prv.SystemHandlers.ApplicationReady.apply(this, arguments);
            }
        },
        CallbackRouter: function (e) {
            /*
                e.source //Caller's Instance (window.opener)
                e.origin //Caller's URL
                e.data   //payload from caller
            */
            var operation = e.data.Operation;
            var sourceApplication = e.data.Source;
            var targetApplication = e.data.Target;
            var args = e.data.Arguments;
            var response = e.data.Result;
            var incommingMessageID = e.data.MessageID;
            var coorId = e.data.CorrID || 0;

            if (sourceApplication == prv.Application) {
                return; // if source is self then ignore the message
            }

            if (!prv.ClientUrls[sourceApplication] ||
                !prv.Clients[sourceApplication] ||
                prv.Clients[sourceApplication].closed) {
                prv.ClientUrls[sourceApplication] = prv.ClientUrls[sourceApplication] || e.origin;
                // wrap the source to ensure that Promises work correctly.  Without this proxy reflection causes exception with cross domain window objects
                prv.Clients[sourceApplication] = new WindowAdaper(e.source, e.origin);
            }

            //TODO: MW 20170317: Add support for proxy relay
            //if (targetApplication !== prv.Application || targetApplication === "*") {
            //    //relay logic here
            //    for (var clientName in prv.Clients) {
            //        if (clientName == sourceApplication) continue; // don't send to the source
            //        if (clientName == prv.Application) continue; // don't send to self
            //        var client = prv.Clients[clientName];
            //        if (client && client.closed) continue; // no longer connected so ignore
            //        prv.SendMessageOn(client, targetApplication, operation, args, undefined, sourceApplication, incommingMessageID);
            //    }
            //}

            if (targetApplication !== prv.Application && targetApplication != "*") {
                // if your app is not targeted then ignore the message
                return;
            }

            var source = prv.Clients[sourceApplication];

            // lookup operation function on controller 
            var func = prv.SystemHandlers[operation] || prv.Controller[operation];

            // if the operation exists then 
            var result = null;
            var handled = false;
            if (func) {
                if (response) {
                    // if the message had a Result Property then it is a Reply
                    args = [response, args];
                }
                handled = true;
                result = func.apply(source, args);
            }

            // if (coorId !== 0 && !operation.endWith('_Response')) {
            if (!e.data.CorrID || e.data.CorrID == 0) {
                if (e.source && !e.source.closed) {
                    var message = prv.MessageBuilder(sourceApplication, operation + '_Response', args, result, incommingMessageID, handled, undefined, undefined);
                    e.source.postMessage(message, "*");
                }
            }
        },
        Receiver: function (e) {
            /*
                e.source //Caller's Instance (window.opener)
                e.origin //Caller's URL
                e.data   //payload from caller
            */

            if (prv.OnReceived) {
                prv.OnReceived(e);
            }

            if (e.data.CorrID >= 0) {
                var sentMessage = prv.SendMessages[e.data.CorrID];
                if (sentMessage && !sentMessage.Handled) {
                    if (sentMessage.Timer) {
                        clearTimeout(sentMessage.Timer);
                    }
                    sentMessage.Handled = true;
                    delete prv.SendMessages[e.data.CorrID];
                    if (sentMessage.onreceived) {
                        sentMessage.onreceived(e.data.Result);
                    }
                }
            }

            prv.CallbackRouter(e);
        },
        GetProxy: function (clientProxy, clientName) {
            var clientUrl = prv.ClientUrls[clientName];
            if (clientProxy && !clientProxy.closed) {
                if (typeof clientProxy !== 'WindowAdaper') {
                    clientProxy = new WindowAdaper(clientProxy, clientUrl);
                }
                return Promise.resolve(clientProxy);
            } else {
                var promise = new Promise(function (fulfill, reject) {
                    // tools.setImmediate(function () {
                    var newPopup = window.open(clientUrl, '_blank');
                    var newClient = new WindowAdaper(newPopup, clientUrl);
                    prv.PendingClients[clientName] = false;
                    prv.Clients[clientName] = newClient;

                    fulfill(newClient);
                    // });
                });
                return promise;
            }
        },
        ResolveClient: function (clientName) {
            var clientProxy = prv.Clients[clientName];
            if (clientProxy && !clientProxy.closed) {
                return Promise.resolve(clientProxy);
            } else if (prv.PendingClients[clientName]) {
                var err = new Error('Another Action is Pending.  Please Wait!');
                err.data = clientName;
                return Promise.reject(err);
            } else {
                prv.PendingClients[clientName] = true;
                delete prv.Clients[clientName];
                var promise = prv.GetProxy(null, clientName);
                return promise;
            }
        },
        SendMessageOn: function (proxy, targetApplication, operationName, args, timeout, sendOnBehalfOf, sendOnBehalfOfID) {
            try {
                tools.log(['SendMessageOn', proxy, targetApplication, operationName, args]);
                if (prv.OnSent) {
                    prv.OnSent({
                        target: proxy,
                        origin: window.location.toString(),
                        data: {
                            Source: prv.Application,
                            Target: targetApplication,
                            BehalfOf: sendOnBehalfOf,
                            BehalfOfID: sendOnBehalfOfID,
                            Operation: operationName,
                            Arguments: args
                        }
                    });
                }

                var sentMessage = {
                    Message: undefined,
                    MessageID: undefined,
                    Promise: undefined,
                    Handled: false,
                    Proxy: proxy,
                    Timer: undefined
                };

                sentMessage.Promise = new Promise(function (fulfill, reject) {
                    if (proxy && operationName) {
                        if (proxy.closed) {
                            return Promise.reject(new Error('Connection is Closed.  Please Try again'))
                        }

                        var message = prv.MessageBuilder(targetApplication, operationName, args, undefined, undefined, undefined, sendOnBehalfOf, sendOnBehalfOfID);

                        sentMessage.ontimeout = reject;
                        sentMessage.onreceived = fulfill;

                        sentMessage.Message = message;
                        sentMessage.MessageID = message.MessageID;

                        var ret = proxy.postMessage(message, "*");
                        if (ret) {
                            fulfill(true);
                        }
                    }
                });

                if (sentMessage.MessageID >= 0 && timeout <= -1) {
                    sentMessage.Timer = setTimeout(
                        function () {
                            if (!sentMessage.Handled && sentMessage.ontimeout) {
                                var err = new Error('Operation Timed out');
                                err.data = sentMessage.Message;
                                sentMessage.ontimeout(err);
                            }
                        }, (timeout || prv.TimeOutSeconds) * 1000);
                    prv.SendMessages[sentMessage.MessageID] = sentMessage;
                }

                return sentMessage.Promise;
            } catch (ex) {
                return Promise.reject(ex);
            }
        },
        SendMessage: function (clientName, operationName, args, timeout) {
            /// <signature>
            ///     <summary>SendMessage</summary>
            ///     <param name="clientName" type="string">Name for the target client</param>
            ///     <param name="operationName" type="string">Name for the target operation</param>
            ///     <param name="args" type="object[]">parameters for the target operation</param>
            ///     <param name="timeout" type="int" optional="true">timeout for send message.  If not provided the default will be used</param>
            ///     <returns type="Promise">promise of sent message</returns>
            /// </signature>
            try {
                var clientPromise = prv.ResolveClient(clientName);
                var sentPromise = clientPromise.then(function (client) {
                    return prv.SendMessageOn(client, clientName, operationName, args, timeout);
                });
                return sentPromise;
            }
            catch (ex) {
                return Promise.reject(ex);
            }
        },
        GetConnectedClients: function () {
            var clients = {};
            clients[prv.Application] = window.location.toString();
            for (var clientName in prv.Clients) {
                var client = prv.Clients[clientName];
                var clientUrl = prv.ClientUrls[clientName];
                if (client && !client.closed) {
                    clients[clientName] = clientUrl;
                }
            }
            return clients;
        },
        NotifyOpener: function () {
            if (window.opener && !window.opener.closed) {
                var connectedClients = prv.GetConnectedClients();
                return prv.SendMessageOn(window.opener, '*', 'ApplicationLoaded', [connectedClients]);
            }
        },
        NotifyAll: function () { //this does not try to reconnect
            var connectedClients = prv.GetConnectedClients();
            //if (window.opener && !window.opener.closed) {
            //    prv.SendMessageOn(window.opener, '*', 'ApplicationReady', [connectedClients]);
            //}
            for (var clientName in prv.Clients) {
                try {
                    var clientProxy = prv.Clients[clientName];
                    if (clientProxy && !clientProxy.closed) {
                        prv.SendMessageOn(clientProxy, '*', 'ApplicationReady', [connectedClients]);
                    }
                }
                catch (ex) {
                    console.error(ex);
                }
            }
        }
    };
    var ctrl = {
        SendMessage: function (clientName, operationName, args, timeout) {
            /// <signature>
            ///     <summary>SendMessage</summary>
            ///     <param name="clientName" type="string">Name for the target client</param>
            ///     <param name="operationName" type="string">Name for the target operation</param>
            ///     <param name="args" type="object[]">parameters for the target operation</param>
            ///     <param name="timeout" type="int" optional="true">
            ///         timeout for send message.  If not provided the default will be used. Turn off timeout if the value is -1 
            ///     </param>
            ///     <returns type="Promise">promise of sent message</returns>
            /// </signature>
            var promise = prv.SendMessage(clientName, operationName, args);
            return promise;
        },
        SendReady: function () {
            prv.NotifyAll();
        }
    };

    ctrl.__defineSetter__('onreceived', function (func) { prv.OnReceived = func; });
    ctrl.__defineGetter__('onreceived', function () { return prv.OnReceived; });
    ctrl.__defineSetter__('onsent', function (func) { prv.OnSent = func; });
    ctrl.__defineGetter__('onsent', function () { return prv.OnSent; });

    //ctrl.__defineSetter__('ApplicationName', function (value) { prv.Application = value || {}; });
    ctrl.__defineGetter__('ApplicationName', function () { return prv.Application; });

    //ctrl.__defineSetter__('ApplicationDef', function (value) { prv.MyDef = value || {}; });
    ctrl.__defineGetter__('ApplicationDef', function () { return prv.MyDef; });

    ctrl.__defineSetter__('Clients', function (value) { prv.ClientUrls = value || {}; });
    ctrl.__defineGetter__('Clients', function () { return prv.ClientUrls; });

    ctrl.__defineSetter__('TimeOutSeconds', function (value) { prv.TimeOutSeconds = value || 10; });
    ctrl.__defineGetter__('TimeOutSeconds', function () { return prv.TimeOutSeconds; });

    tools.bindEvent(window, 'load', prv.NotifyOpener, false);
    tools.bindEvent(window, 'message', prv.Receiver, false);
    return ctrl;
}