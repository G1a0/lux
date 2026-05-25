/**
 * @name Lux
 * @version 0.1.0
 * @description 英雄联盟智能选人推荐插件
 * @author giao1907
 * @link https://github.com/giao1907/lux
 */
import "./index.css";
var zv = Object.defineProperty;
var Ev = (o, v, S) => v in o ? zv(o, v, { enumerable: !0, configurable: !0, writable: !0, value: S }) : o[v] = S;
var $t = (o, v, S) => Ev(o, typeof v != "symbol" ? v + "" : v, S);
var gf = { exports: {} }, Te = {}, Sf = { exports: {} }, bf = {};
/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var xd;
function Tv() {
  return xd || (xd = 1, (function(o) {
    function v(E, M) {
      var Y = E.length;
      E.push(M);
      l: for (; 0 < Y; ) {
        var el = Y - 1 >>> 1, sl = E[el];
        if (0 < R(sl, M))
          E[el] = M, E[Y] = sl, Y = el;
        else break l;
      }
    }
    function S(E) {
      return E.length === 0 ? null : E[0];
    }
    function f(E) {
      if (E.length === 0) return null;
      var M = E[0], Y = E.pop();
      if (Y !== M) {
        E[0] = Y;
        l: for (var el = 0, sl = E.length, y = sl >>> 1; el < y; ) {
          var _ = 2 * (el + 1) - 1, D = E[_], H = _ + 1, Q = E[H];
          if (0 > R(D, Y))
            H < sl && 0 > R(Q, D) ? (E[el] = Q, E[H] = Y, el = H) : (E[el] = D, E[_] = Y, el = _);
          else if (H < sl && 0 > R(Q, Y))
            E[el] = Q, E[H] = Y, el = H;
          else break l;
        }
      }
      return M;
    }
    function R(E, M) {
      var Y = E.sortIndex - M.sortIndex;
      return Y !== 0 ? Y : E.id - M.id;
    }
    if (o.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var X = performance;
      o.unstable_now = function() {
        return X.now();
      };
    } else {
      var j = Date, U = j.now();
      o.unstable_now = function() {
        return j.now() - U;
      };
    }
    var O = [], p = [], V = 1, q = null, fl = 3, zl = !1, Nl = !1, Ml = !1, Xl = !1, _l = typeof setTimeout == "function" ? setTimeout : null, Wt = typeof clearTimeout == "function" ? clearTimeout : null, Bl = typeof setImmediate < "u" ? setImmediate : null;
    function ct(E) {
      for (var M = S(p); M !== null; ) {
        if (M.callback === null) f(p);
        else if (M.startTime <= E)
          f(p), M.sortIndex = M.expirationTime, v(O, M);
        else break;
        M = S(p);
      }
    }
    function Tt(E) {
      if (Ml = !1, ct(E), !Nl)
        if (S(O) !== null)
          Nl = !0, Ql || (Ql = !0, Ll());
        else {
          var M = S(p);
          M !== null && St(Tt, M.startTime - E);
        }
    }
    var Ql = !1, k = -1, Zl = 5, pt = -1;
    function La() {
      return Xl ? !0 : !(o.unstable_now() - pt < Zl);
    }
    function At() {
      if (Xl = !1, Ql) {
        var E = o.unstable_now();
        pt = E;
        var M = !0;
        try {
          l: {
            Nl = !1, Ml && (Ml = !1, Wt(k), k = -1), zl = !0;
            var Y = fl;
            try {
              t: {
                for (ct(E), q = S(O); q !== null && !(q.expirationTime > E && La()); ) {
                  var el = q.callback;
                  if (typeof el == "function") {
                    q.callback = null, fl = q.priorityLevel;
                    var sl = el(
                      q.expirationTime <= E
                    );
                    if (E = o.unstable_now(), typeof sl == "function") {
                      q.callback = sl, ct(E), M = !0;
                      break t;
                    }
                    q === S(O) && f(O), ct(E);
                  } else f(O);
                  q = S(O);
                }
                if (q !== null) M = !0;
                else {
                  var y = S(p);
                  y !== null && St(
                    Tt,
                    y.startTime - E
                  ), M = !1;
                }
              }
              break l;
            } finally {
              q = null, fl = Y, zl = !1;
            }
            M = void 0;
          }
        } finally {
          M ? Ll() : Ql = !1;
        }
      }
    }
    var Ll;
    if (typeof Bl == "function")
      Ll = function() {
        Bl(At);
      };
    else if (typeof MessageChannel < "u") {
      var Ta = new MessageChannel(), Ut = Ta.port2;
      Ta.port1.onmessage = At, Ll = function() {
        Ut.postMessage(null);
      };
    } else
      Ll = function() {
        _l(At, 0);
      };
    function St(E, M) {
      k = _l(function() {
        E(o.unstable_now());
      }, M);
    }
    o.unstable_IdlePriority = 5, o.unstable_ImmediatePriority = 1, o.unstable_LowPriority = 4, o.unstable_NormalPriority = 3, o.unstable_Profiling = null, o.unstable_UserBlockingPriority = 2, o.unstable_cancelCallback = function(E) {
      E.callback = null;
    }, o.unstable_forceFrameRate = function(E) {
      0 > E || 125 < E ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : Zl = 0 < E ? Math.floor(1e3 / E) : 5;
    }, o.unstable_getCurrentPriorityLevel = function() {
      return fl;
    }, o.unstable_next = function(E) {
      switch (fl) {
        case 1:
        case 2:
        case 3:
          var M = 3;
          break;
        default:
          M = fl;
      }
      var Y = fl;
      fl = M;
      try {
        return E();
      } finally {
        fl = Y;
      }
    }, o.unstable_requestPaint = function() {
      Xl = !0;
    }, o.unstable_runWithPriority = function(E, M) {
      switch (E) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          E = 3;
      }
      var Y = fl;
      fl = E;
      try {
        return M();
      } finally {
        fl = Y;
      }
    }, o.unstable_scheduleCallback = function(E, M, Y) {
      var el = o.unstable_now();
      switch (typeof Y == "object" && Y !== null ? (Y = Y.delay, Y = typeof Y == "number" && 0 < Y ? el + Y : el) : Y = el, E) {
        case 1:
          var sl = -1;
          break;
        case 2:
          sl = 250;
          break;
        case 5:
          sl = 1073741823;
          break;
        case 4:
          sl = 1e4;
          break;
        default:
          sl = 5e3;
      }
      return sl = Y + sl, E = {
        id: V++,
        callback: M,
        priorityLevel: E,
        startTime: Y,
        expirationTime: sl,
        sortIndex: -1
      }, Y > el ? (E.sortIndex = Y, v(p, E), S(O) === null && E === S(p) && (Ml ? (Wt(k), k = -1) : Ml = !0, St(Tt, Y - el))) : (E.sortIndex = sl, v(O, E), Nl || zl || (Nl = !0, Ql || (Ql = !0, Ll()))), E;
    }, o.unstable_shouldYield = La, o.unstable_wrapCallback = function(E) {
      var M = fl;
      return function() {
        var Y = fl;
        fl = M;
        try {
          return E.apply(this, arguments);
        } finally {
          fl = Y;
        }
      };
    };
  })(bf)), bf;
}
var qd;
function pv() {
  return qd || (qd = 1, Sf.exports = Tv()), Sf.exports;
}
var zf = { exports: {} }, G = {};
/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Bd;
function Av() {
  if (Bd) return G;
  Bd = 1;
  var o = Symbol.for("react.transitional.element"), v = Symbol.for("react.portal"), S = Symbol.for("react.fragment"), f = Symbol.for("react.strict_mode"), R = Symbol.for("react.profiler"), X = Symbol.for("react.consumer"), j = Symbol.for("react.context"), U = Symbol.for("react.forward_ref"), O = Symbol.for("react.suspense"), p = Symbol.for("react.memo"), V = Symbol.for("react.lazy"), q = Symbol.for("react.activity"), fl = Symbol.iterator;
  function zl(y) {
    return y === null || typeof y != "object" ? null : (y = fl && y[fl] || y["@@iterator"], typeof y == "function" ? y : null);
  }
  var Nl = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, Ml = Object.assign, Xl = {};
  function _l(y, _, D) {
    this.props = y, this.context = _, this.refs = Xl, this.updater = D || Nl;
  }
  _l.prototype.isReactComponent = {}, _l.prototype.setState = function(y, _) {
    if (typeof y != "object" && typeof y != "function" && y != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, y, _, "setState");
  }, _l.prototype.forceUpdate = function(y) {
    this.updater.enqueueForceUpdate(this, y, "forceUpdate");
  };
  function Wt() {
  }
  Wt.prototype = _l.prototype;
  function Bl(y, _, D) {
    this.props = y, this.context = _, this.refs = Xl, this.updater = D || Nl;
  }
  var ct = Bl.prototype = new Wt();
  ct.constructor = Bl, Ml(ct, _l.prototype), ct.isPureReactComponent = !0;
  var Tt = Array.isArray;
  function Ql() {
  }
  var k = { H: null, A: null, T: null, S: null }, Zl = Object.prototype.hasOwnProperty;
  function pt(y, _, D) {
    var H = D.ref;
    return {
      $$typeof: o,
      type: y,
      key: _,
      ref: H !== void 0 ? H : null,
      props: D
    };
  }
  function La(y, _) {
    return pt(y.type, _, y.props);
  }
  function At(y) {
    return typeof y == "object" && y !== null && y.$$typeof === o;
  }
  function Ll(y) {
    var _ = { "=": "=0", ":": "=2" };
    return "$" + y.replace(/[=:]/g, function(D) {
      return _[D];
    });
  }
  var Ta = /\/+/g;
  function Ut(y, _) {
    return typeof y == "object" && y !== null && y.key != null ? Ll("" + y.key) : _.toString(36);
  }
  function St(y) {
    switch (y.status) {
      case "fulfilled":
        return y.value;
      case "rejected":
        throw y.reason;
      default:
        switch (typeof y.status == "string" ? y.then(Ql, Ql) : (y.status = "pending", y.then(
          function(_) {
            y.status === "pending" && (y.status = "fulfilled", y.value = _);
          },
          function(_) {
            y.status === "pending" && (y.status = "rejected", y.reason = _);
          }
        )), y.status) {
          case "fulfilled":
            return y.value;
          case "rejected":
            throw y.reason;
        }
    }
    throw y;
  }
  function E(y, _, D, H, Q) {
    var K = typeof y;
    (K === "undefined" || K === "boolean") && (y = null);
    var tl = !1;
    if (y === null) tl = !0;
    else
      switch (K) {
        case "bigint":
        case "string":
        case "number":
          tl = !0;
          break;
        case "object":
          switch (y.$$typeof) {
            case o:
            case v:
              tl = !0;
              break;
            case V:
              return tl = y._init, E(
                tl(y._payload),
                _,
                D,
                H,
                Q
              );
          }
      }
    if (tl)
      return Q = Q(y), tl = H === "" ? "." + Ut(y, 0) : H, Tt(Q) ? (D = "", tl != null && (D = tl.replace(Ta, "$&/") + "/"), E(Q, _, D, "", function(Uu) {
        return Uu;
      })) : Q != null && (At(Q) && (Q = La(
        Q,
        D + (Q.key == null || y && y.key === Q.key ? "" : ("" + Q.key).replace(
          Ta,
          "$&/"
        ) + "/") + tl
      )), _.push(Q)), 1;
    tl = 0;
    var jl = H === "" ? "." : H + ":";
    if (Tt(y))
      for (var gl = 0; gl < y.length; gl++)
        H = y[gl], K = jl + Ut(H, gl), tl += E(
          H,
          _,
          D,
          K,
          Q
        );
    else if (gl = zl(y), typeof gl == "function")
      for (y = gl.call(y), gl = 0; !(H = y.next()).done; )
        H = H.value, K = jl + Ut(H, gl++), tl += E(
          H,
          _,
          D,
          K,
          Q
        );
    else if (K === "object") {
      if (typeof y.then == "function")
        return E(
          St(y),
          _,
          D,
          H,
          Q
        );
      throw _ = String(y), Error(
        "Objects are not valid as a React child (found: " + (_ === "[object Object]" ? "object with keys {" + Object.keys(y).join(", ") + "}" : _) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return tl;
  }
  function M(y, _, D) {
    if (y == null) return y;
    var H = [], Q = 0;
    return E(y, H, "", "", function(K) {
      return _.call(D, K, Q++);
    }), H;
  }
  function Y(y) {
    if (y._status === -1) {
      var _ = y._result;
      _ = _(), _.then(
        function(D) {
          (y._status === 0 || y._status === -1) && (y._status = 1, y._result = D);
        },
        function(D) {
          (y._status === 0 || y._status === -1) && (y._status = 2, y._result = D);
        }
      ), y._status === -1 && (y._status = 0, y._result = _);
    }
    if (y._status === 1) return y._result.default;
    throw y._result;
  }
  var el = typeof reportError == "function" ? reportError : function(y) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var _ = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof y == "object" && y !== null && typeof y.message == "string" ? String(y.message) : String(y),
        error: y
      });
      if (!window.dispatchEvent(_)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", y);
      return;
    }
    console.error(y);
  }, sl = {
    map: M,
    forEach: function(y, _, D) {
      M(
        y,
        function() {
          _.apply(this, arguments);
        },
        D
      );
    },
    count: function(y) {
      var _ = 0;
      return M(y, function() {
        _++;
      }), _;
    },
    toArray: function(y) {
      return M(y, function(_) {
        return _;
      }) || [];
    },
    only: function(y) {
      if (!At(y))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return y;
    }
  };
  return G.Activity = q, G.Children = sl, G.Component = _l, G.Fragment = S, G.Profiler = R, G.PureComponent = Bl, G.StrictMode = f, G.Suspense = O, G.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = k, G.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(y) {
      return k.H.useMemoCache(y);
    }
  }, G.cache = function(y) {
    return function() {
      return y.apply(null, arguments);
    };
  }, G.cacheSignal = function() {
    return null;
  }, G.cloneElement = function(y, _, D) {
    if (y == null)
      throw Error(
        "The argument must be a React element, but you passed " + y + "."
      );
    var H = Ml({}, y.props), Q = y.key;
    if (_ != null)
      for (K in _.key !== void 0 && (Q = "" + _.key), _)
        !Zl.call(_, K) || K === "key" || K === "__self" || K === "__source" || K === "ref" && _.ref === void 0 || (H[K] = _[K]);
    var K = arguments.length - 2;
    if (K === 1) H.children = D;
    else if (1 < K) {
      for (var tl = Array(K), jl = 0; jl < K; jl++)
        tl[jl] = arguments[jl + 2];
      H.children = tl;
    }
    return pt(y.type, Q, H);
  }, G.createContext = function(y) {
    return y = {
      $$typeof: j,
      _currentValue: y,
      _currentValue2: y,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, y.Provider = y, y.Consumer = {
      $$typeof: X,
      _context: y
    }, y;
  }, G.createElement = function(y, _, D) {
    var H, Q = {}, K = null;
    if (_ != null)
      for (H in _.key !== void 0 && (K = "" + _.key), _)
        Zl.call(_, H) && H !== "key" && H !== "__self" && H !== "__source" && (Q[H] = _[H]);
    var tl = arguments.length - 2;
    if (tl === 1) Q.children = D;
    else if (1 < tl) {
      for (var jl = Array(tl), gl = 0; gl < tl; gl++)
        jl[gl] = arguments[gl + 2];
      Q.children = jl;
    }
    if (y && y.defaultProps)
      for (H in tl = y.defaultProps, tl)
        Q[H] === void 0 && (Q[H] = tl[H]);
    return pt(y, K, Q);
  }, G.createRef = function() {
    return { current: null };
  }, G.forwardRef = function(y) {
    return { $$typeof: U, render: y };
  }, G.isValidElement = At, G.lazy = function(y) {
    return {
      $$typeof: V,
      _payload: { _status: -1, _result: y },
      _init: Y
    };
  }, G.memo = function(y, _) {
    return {
      $$typeof: p,
      type: y,
      compare: _ === void 0 ? null : _
    };
  }, G.startTransition = function(y) {
    var _ = k.T, D = {};
    k.T = D;
    try {
      var H = y(), Q = k.S;
      Q !== null && Q(D, H), typeof H == "object" && H !== null && typeof H.then == "function" && H.then(Ql, el);
    } catch (K) {
      el(K);
    } finally {
      _ !== null && D.types !== null && (_.types = D.types), k.T = _;
    }
  }, G.unstable_useCacheRefresh = function() {
    return k.H.useCacheRefresh();
  }, G.use = function(y) {
    return k.H.use(y);
  }, G.useActionState = function(y, _, D) {
    return k.H.useActionState(y, _, D);
  }, G.useCallback = function(y, _) {
    return k.H.useCallback(y, _);
  }, G.useContext = function(y) {
    return k.H.useContext(y);
  }, G.useDebugValue = function() {
  }, G.useDeferredValue = function(y, _) {
    return k.H.useDeferredValue(y, _);
  }, G.useEffect = function(y, _) {
    return k.H.useEffect(y, _);
  }, G.useEffectEvent = function(y) {
    return k.H.useEffectEvent(y);
  }, G.useId = function() {
    return k.H.useId();
  }, G.useImperativeHandle = function(y, _, D) {
    return k.H.useImperativeHandle(y, _, D);
  }, G.useInsertionEffect = function(y, _) {
    return k.H.useInsertionEffect(y, _);
  }, G.useLayoutEffect = function(y, _) {
    return k.H.useLayoutEffect(y, _);
  }, G.useMemo = function(y, _) {
    return k.H.useMemo(y, _);
  }, G.useOptimistic = function(y, _) {
    return k.H.useOptimistic(y, _);
  }, G.useReducer = function(y, _, D) {
    return k.H.useReducer(y, _, D);
  }, G.useRef = function(y) {
    return k.H.useRef(y);
  }, G.useState = function(y) {
    return k.H.useState(y);
  }, G.useSyncExternalStore = function(y, _, D) {
    return k.H.useSyncExternalStore(
      y,
      _,
      D
    );
  }, G.useTransition = function() {
    return k.H.useTransition();
  }, G.version = "19.2.6", G;
}
var Yd;
function Uf() {
  return Yd || (Yd = 1, zf.exports = Av()), zf.exports;
}
var Ef = { exports: {} }, Yl = {};
/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var jd;
function _v() {
  if (jd) return Yl;
  jd = 1;
  var o = Uf();
  function v(O) {
    var p = "https://react.dev/errors/" + O;
    if (1 < arguments.length) {
      p += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var V = 2; V < arguments.length; V++)
        p += "&args[]=" + encodeURIComponent(arguments[V]);
    }
    return "Minified React error #" + O + "; visit " + p + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function S() {
  }
  var f = {
    d: {
      f: S,
      r: function() {
        throw Error(v(522));
      },
      D: S,
      C: S,
      L: S,
      m: S,
      X: S,
      S,
      M: S
    },
    p: 0,
    findDOMNode: null
  }, R = Symbol.for("react.portal");
  function X(O, p, V) {
    var q = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: R,
      key: q == null ? null : "" + q,
      children: O,
      containerInfo: p,
      implementation: V
    };
  }
  var j = o.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function U(O, p) {
    if (O === "font") return "";
    if (typeof p == "string")
      return p === "use-credentials" ? p : "";
  }
  return Yl.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = f, Yl.createPortal = function(O, p) {
    var V = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!p || p.nodeType !== 1 && p.nodeType !== 9 && p.nodeType !== 11)
      throw Error(v(299));
    return X(O, p, null, V);
  }, Yl.flushSync = function(O) {
    var p = j.T, V = f.p;
    try {
      if (j.T = null, f.p = 2, O) return O();
    } finally {
      j.T = p, f.p = V, f.d.f();
    }
  }, Yl.preconnect = function(O, p) {
    typeof O == "string" && (p ? (p = p.crossOrigin, p = typeof p == "string" ? p === "use-credentials" ? p : "" : void 0) : p = null, f.d.C(O, p));
  }, Yl.prefetchDNS = function(O) {
    typeof O == "string" && f.d.D(O);
  }, Yl.preinit = function(O, p) {
    if (typeof O == "string" && p && typeof p.as == "string") {
      var V = p.as, q = U(V, p.crossOrigin), fl = typeof p.integrity == "string" ? p.integrity : void 0, zl = typeof p.fetchPriority == "string" ? p.fetchPriority : void 0;
      V === "style" ? f.d.S(
        O,
        typeof p.precedence == "string" ? p.precedence : void 0,
        {
          crossOrigin: q,
          integrity: fl,
          fetchPriority: zl
        }
      ) : V === "script" && f.d.X(O, {
        crossOrigin: q,
        integrity: fl,
        fetchPriority: zl,
        nonce: typeof p.nonce == "string" ? p.nonce : void 0
      });
    }
  }, Yl.preinitModule = function(O, p) {
    if (typeof O == "string")
      if (typeof p == "object" && p !== null) {
        if (p.as == null || p.as === "script") {
          var V = U(
            p.as,
            p.crossOrigin
          );
          f.d.M(O, {
            crossOrigin: V,
            integrity: typeof p.integrity == "string" ? p.integrity : void 0,
            nonce: typeof p.nonce == "string" ? p.nonce : void 0
          });
        }
      } else p == null && f.d.M(O);
  }, Yl.preload = function(O, p) {
    if (typeof O == "string" && typeof p == "object" && p !== null && typeof p.as == "string") {
      var V = p.as, q = U(V, p.crossOrigin);
      f.d.L(O, V, {
        crossOrigin: q,
        integrity: typeof p.integrity == "string" ? p.integrity : void 0,
        nonce: typeof p.nonce == "string" ? p.nonce : void 0,
        type: typeof p.type == "string" ? p.type : void 0,
        fetchPriority: typeof p.fetchPriority == "string" ? p.fetchPriority : void 0,
        referrerPolicy: typeof p.referrerPolicy == "string" ? p.referrerPolicy : void 0,
        imageSrcSet: typeof p.imageSrcSet == "string" ? p.imageSrcSet : void 0,
        imageSizes: typeof p.imageSizes == "string" ? p.imageSizes : void 0,
        media: typeof p.media == "string" ? p.media : void 0
      });
    }
  }, Yl.preloadModule = function(O, p) {
    if (typeof O == "string")
      if (p) {
        var V = U(p.as, p.crossOrigin);
        f.d.m(O, {
          as: typeof p.as == "string" && p.as !== "script" ? p.as : void 0,
          crossOrigin: V,
          integrity: typeof p.integrity == "string" ? p.integrity : void 0
        });
      } else f.d.m(O);
  }, Yl.requestFormReset = function(O) {
    f.d.r(O);
  }, Yl.unstable_batchedUpdates = function(O, p) {
    return O(p);
  }, Yl.useFormState = function(O, p, V) {
    return j.H.useFormState(O, p, V);
  }, Yl.useFormStatus = function() {
    return j.H.useHostTransitionStatus();
  }, Yl.version = "19.2.6", Yl;
}
var Gd;
function $d() {
  if (Gd) return Ef.exports;
  Gd = 1;
  function o() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(o);
      } catch (v) {
        console.error(v);
      }
  }
  return o(), Ef.exports = _v(), Ef.exports;
}
/**
 * @license React
 * react-dom-client.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Xd;
function Ov() {
  if (Xd) return Te;
  Xd = 1;
  var o = pv(), v = Uf(), S = $d();
  function f(l) {
    var t = "https://react.dev/errors/" + l;
    if (1 < arguments.length) {
      t += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var a = 2; a < arguments.length; a++)
        t += "&args[]=" + encodeURIComponent(arguments[a]);
    }
    return "Minified React error #" + l + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function R(l) {
    return !(!l || l.nodeType !== 1 && l.nodeType !== 9 && l.nodeType !== 11);
  }
  function X(l) {
    var t = l, a = l;
    if (l.alternate) for (; t.return; ) t = t.return;
    else {
      l = t;
      do
        t = l, (t.flags & 4098) !== 0 && (a = t.return), l = t.return;
      while (l);
    }
    return t.tag === 3 ? a : null;
  }
  function j(l) {
    if (l.tag === 13) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function U(l) {
    if (l.tag === 31) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function O(l) {
    if (X(l) !== l)
      throw Error(f(188));
  }
  function p(l) {
    var t = l.alternate;
    if (!t) {
      if (t = X(l), t === null) throw Error(f(188));
      return t !== l ? null : l;
    }
    for (var a = l, u = t; ; ) {
      var e = a.return;
      if (e === null) break;
      var n = e.alternate;
      if (n === null) {
        if (u = e.return, u !== null) {
          a = u;
          continue;
        }
        break;
      }
      if (e.child === n.child) {
        for (n = e.child; n; ) {
          if (n === a) return O(e), l;
          if (n === u) return O(e), t;
          n = n.sibling;
        }
        throw Error(f(188));
      }
      if (a.return !== u.return) a = e, u = n;
      else {
        for (var i = !1, c = e.child; c; ) {
          if (c === a) {
            i = !0, a = e, u = n;
            break;
          }
          if (c === u) {
            i = !0, u = e, a = n;
            break;
          }
          c = c.sibling;
        }
        if (!i) {
          for (c = n.child; c; ) {
            if (c === a) {
              i = !0, a = n, u = e;
              break;
            }
            if (c === u) {
              i = !0, u = n, a = e;
              break;
            }
            c = c.sibling;
          }
          if (!i) throw Error(f(189));
        }
      }
      if (a.alternate !== u) throw Error(f(190));
    }
    if (a.tag !== 3) throw Error(f(188));
    return a.stateNode.current === a ? l : t;
  }
  function V(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l;
    for (l = l.child; l !== null; ) {
      if (t = V(l), t !== null) return t;
      l = l.sibling;
    }
    return null;
  }
  var q = Object.assign, fl = Symbol.for("react.element"), zl = Symbol.for("react.transitional.element"), Nl = Symbol.for("react.portal"), Ml = Symbol.for("react.fragment"), Xl = Symbol.for("react.strict_mode"), _l = Symbol.for("react.profiler"), Wt = Symbol.for("react.consumer"), Bl = Symbol.for("react.context"), ct = Symbol.for("react.forward_ref"), Tt = Symbol.for("react.suspense"), Ql = Symbol.for("react.suspense_list"), k = Symbol.for("react.memo"), Zl = Symbol.for("react.lazy"), pt = Symbol.for("react.activity"), La = Symbol.for("react.memo_cache_sentinel"), At = Symbol.iterator;
  function Ll(l) {
    return l === null || typeof l != "object" ? null : (l = At && l[At] || l["@@iterator"], typeof l == "function" ? l : null);
  }
  var Ta = Symbol.for("react.client.reference");
  function Ut(l) {
    if (l == null) return null;
    if (typeof l == "function")
      return l.$$typeof === Ta ? null : l.displayName || l.name || null;
    if (typeof l == "string") return l;
    switch (l) {
      case Ml:
        return "Fragment";
      case _l:
        return "Profiler";
      case Xl:
        return "StrictMode";
      case Tt:
        return "Suspense";
      case Ql:
        return "SuspenseList";
      case pt:
        return "Activity";
    }
    if (typeof l == "object")
      switch (l.$$typeof) {
        case Nl:
          return "Portal";
        case Bl:
          return l.displayName || "Context";
        case Wt:
          return (l._context.displayName || "Context") + ".Consumer";
        case ct:
          var t = l.render;
          return l = l.displayName, l || (l = t.displayName || t.name || "", l = l !== "" ? "ForwardRef(" + l + ")" : "ForwardRef"), l;
        case k:
          return t = l.displayName || null, t !== null ? t : Ut(l.type) || "Memo";
        case Zl:
          t = l._payload, l = l._init;
          try {
            return Ut(l(t));
          } catch {
          }
      }
    return null;
  }
  var St = Array.isArray, E = v.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, M = S.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, Y = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, el = [], sl = -1;
  function y(l) {
    return { current: l };
  }
  function _(l) {
    0 > sl || (l.current = el[sl], el[sl] = null, sl--);
  }
  function D(l, t) {
    sl++, el[sl] = l.current, l.current = t;
  }
  var H = y(null), Q = y(null), K = y(null), tl = y(null);
  function jl(l, t) {
    switch (D(K, t), D(Q, l), D(H, null), t.nodeType) {
      case 9:
      case 11:
        l = (l = t.documentElement) && (l = l.namespaceURI) ? ud(l) : 0;
        break;
      default:
        if (l = t.tagName, t = t.namespaceURI)
          t = ud(t), l = ed(t, l);
        else
          switch (l) {
            case "svg":
              l = 1;
              break;
            case "math":
              l = 2;
              break;
            default:
              l = 0;
          }
    }
    _(H), D(H, l);
  }
  function gl() {
    _(H), _(Q), _(K);
  }
  function Uu(l) {
    l.memoizedState !== null && D(tl, l);
    var t = H.current, a = ed(t, l.type);
    t !== a && (D(Q, l), D(H, a));
  }
  function Oe(l) {
    Q.current === l && (_(H), _(Q)), tl.current === l && (_(tl), Se._currentValue = Y);
  }
  var In, Cf;
  function pa(l) {
    if (In === void 0)
      try {
        throw Error();
      } catch (a) {
        var t = a.stack.trim().match(/\n( *(at )?)/);
        In = t && t[1] || "", Cf = -1 < a.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < a.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + In + l + Cf;
  }
  var Pn = !1;
  function li(l, t) {
    if (!l || Pn) return "";
    Pn = !0;
    var a = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var u = {
        DetermineComponentFrameRoot: function() {
          try {
            if (t) {
              var A = function() {
                throw Error();
              };
              if (Object.defineProperty(A.prototype, "props", {
                set: function() {
                  throw Error();
                }
              }), typeof Reflect == "object" && Reflect.construct) {
                try {
                  Reflect.construct(A, []);
                } catch (b) {
                  var g = b;
                }
                Reflect.construct(l, [], A);
              } else {
                try {
                  A.call();
                } catch (b) {
                  g = b;
                }
                l.call(A.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (b) {
                g = b;
              }
              (A = l()) && typeof A.catch == "function" && A.catch(function() {
              });
            }
          } catch (b) {
            if (b && g && typeof b.stack == "string")
              return [b.stack, g.stack];
          }
          return [null, null];
        }
      };
      u.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var e = Object.getOwnPropertyDescriptor(
        u.DetermineComponentFrameRoot,
        "name"
      );
      e && e.configurable && Object.defineProperty(
        u.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      var n = u.DetermineComponentFrameRoot(), i = n[0], c = n[1];
      if (i && c) {
        var s = i.split(`
`), r = c.split(`
`);
        for (e = u = 0; u < s.length && !s[u].includes("DetermineComponentFrameRoot"); )
          u++;
        for (; e < r.length && !r[e].includes(
          "DetermineComponentFrameRoot"
        ); )
          e++;
        if (u === s.length || e === r.length)
          for (u = s.length - 1, e = r.length - 1; 1 <= u && 0 <= e && s[u] !== r[e]; )
            e--;
        for (; 1 <= u && 0 <= e; u--, e--)
          if (s[u] !== r[e]) {
            if (u !== 1 || e !== 1)
              do
                if (u--, e--, 0 > e || s[u] !== r[e]) {
                  var z = `
` + s[u].replace(" at new ", " at ");
                  return l.displayName && z.includes("<anonymous>") && (z = z.replace("<anonymous>", l.displayName)), z;
                }
              while (1 <= u && 0 <= e);
            break;
          }
      }
    } finally {
      Pn = !1, Error.prepareStackTrace = a;
    }
    return (a = l ? l.displayName || l.name : "") ? pa(a) : "";
  }
  function Fd(l, t) {
    switch (l.tag) {
      case 26:
      case 27:
      case 5:
        return pa(l.type);
      case 16:
        return pa("Lazy");
      case 13:
        return l.child !== t && t !== null ? pa("Suspense Fallback") : pa("Suspense");
      case 19:
        return pa("SuspenseList");
      case 0:
      case 15:
        return li(l.type, !1);
      case 11:
        return li(l.type.render, !1);
      case 1:
        return li(l.type, !0);
      case 31:
        return pa("Activity");
      default:
        return "";
    }
  }
  function Rf(l) {
    try {
      var t = "", a = null;
      do
        t += Fd(l, a), a = l, l = l.return;
      while (l);
      return t;
    } catch (u) {
      return `
Error generating stack: ` + u.message + `
` + u.stack;
    }
  }
  var ti = Object.prototype.hasOwnProperty, ai = o.unstable_scheduleCallback, ui = o.unstable_cancelCallback, Id = o.unstable_shouldYield, Pd = o.unstable_requestPaint, Fl = o.unstable_now, ly = o.unstable_getCurrentPriorityLevel, xf = o.unstable_ImmediatePriority, qf = o.unstable_UserBlockingPriority, Me = o.unstable_NormalPriority, ty = o.unstable_LowPriority, Bf = o.unstable_IdlePriority, ay = o.log, uy = o.unstable_setDisableYieldValue, Nu = null, Il = null;
  function kt(l) {
    if (typeof ay == "function" && uy(l), Il && typeof Il.setStrictMode == "function")
      try {
        Il.setStrictMode(Nu, l);
      } catch {
      }
  }
  var Pl = Math.clz32 ? Math.clz32 : iy, ey = Math.log, ny = Math.LN2;
  function iy(l) {
    return l >>>= 0, l === 0 ? 32 : 31 - (ey(l) / ny | 0) | 0;
  }
  var De = 256, Ue = 262144, Ne = 4194304;
  function Aa(l) {
    var t = l & 42;
    if (t !== 0) return t;
    switch (l & -l) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
        return 128;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
        return l & 261888;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return l & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return l & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return l;
    }
  }
  function He(l, t, a) {
    var u = l.pendingLanes;
    if (u === 0) return 0;
    var e = 0, n = l.suspendedLanes, i = l.pingedLanes;
    l = l.warmLanes;
    var c = u & 134217727;
    return c !== 0 ? (u = c & ~n, u !== 0 ? e = Aa(u) : (i &= c, i !== 0 ? e = Aa(i) : a || (a = c & ~l, a !== 0 && (e = Aa(a))))) : (c = u & ~n, c !== 0 ? e = Aa(c) : i !== 0 ? e = Aa(i) : a || (a = u & ~l, a !== 0 && (e = Aa(a)))), e === 0 ? 0 : t !== 0 && t !== e && (t & n) === 0 && (n = e & -e, a = t & -t, n >= a || n === 32 && (a & 4194048) !== 0) ? t : e;
  }
  function Hu(l, t) {
    return (l.pendingLanes & ~(l.suspendedLanes & ~l.pingedLanes) & t) === 0;
  }
  function cy(l, t) {
    switch (l) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return t + 250;
      case 16:
      case 32:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return t + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function Yf() {
    var l = Ne;
    return Ne <<= 1, (Ne & 62914560) === 0 && (Ne = 4194304), l;
  }
  function ei(l) {
    for (var t = [], a = 0; 31 > a; a++) t.push(l);
    return t;
  }
  function Cu(l, t) {
    l.pendingLanes |= t, t !== 268435456 && (l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0);
  }
  function fy(l, t, a, u, e, n) {
    var i = l.pendingLanes;
    l.pendingLanes = a, l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0, l.expiredLanes &= a, l.entangledLanes &= a, l.errorRecoveryDisabledLanes &= a, l.shellSuspendCounter = 0;
    var c = l.entanglements, s = l.expirationTimes, r = l.hiddenUpdates;
    for (a = i & ~a; 0 < a; ) {
      var z = 31 - Pl(a), A = 1 << z;
      c[z] = 0, s[z] = -1;
      var g = r[z];
      if (g !== null)
        for (r[z] = null, z = 0; z < g.length; z++) {
          var b = g[z];
          b !== null && (b.lane &= -536870913);
        }
      a &= ~A;
    }
    u !== 0 && jf(l, u, 0), n !== 0 && e === 0 && l.tag !== 0 && (l.suspendedLanes |= n & ~(i & ~t));
  }
  function jf(l, t, a) {
    l.pendingLanes |= t, l.suspendedLanes &= ~t;
    var u = 31 - Pl(t);
    l.entangledLanes |= t, l.entanglements[u] = l.entanglements[u] | 1073741824 | a & 261930;
  }
  function Gf(l, t) {
    var a = l.entangledLanes |= t;
    for (l = l.entanglements; a; ) {
      var u = 31 - Pl(a), e = 1 << u;
      e & t | l[u] & t && (l[u] |= t), a &= ~e;
    }
  }
  function Xf(l, t) {
    var a = t & -t;
    return a = (a & 42) !== 0 ? 1 : ni(a), (a & (l.suspendedLanes | t)) !== 0 ? 0 : a;
  }
  function ni(l) {
    switch (l) {
      case 2:
        l = 1;
        break;
      case 8:
        l = 4;
        break;
      case 32:
        l = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        l = 128;
        break;
      case 268435456:
        l = 134217728;
        break;
      default:
        l = 0;
    }
    return l;
  }
  function ii(l) {
    return l &= -l, 2 < l ? 8 < l ? (l & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function Qf() {
    var l = M.p;
    return l !== 0 ? l : (l = window.event, l === void 0 ? 32 : Md(l.type));
  }
  function Zf(l, t) {
    var a = M.p;
    try {
      return M.p = l, t();
    } finally {
      M.p = a;
    }
  }
  var Ft = Math.random().toString(36).slice(2), Hl = "__reactFiber$" + Ft, Vl = "__reactProps$" + Ft, Va = "__reactContainer$" + Ft, ci = "__reactEvents$" + Ft, sy = "__reactListeners$" + Ft, oy = "__reactHandles$" + Ft, Lf = "__reactResources$" + Ft, Ru = "__reactMarker$" + Ft;
  function fi(l) {
    delete l[Hl], delete l[Vl], delete l[ci], delete l[sy], delete l[oy];
  }
  function Ka(l) {
    var t = l[Hl];
    if (t) return t;
    for (var a = l.parentNode; a; ) {
      if (t = a[Va] || a[Hl]) {
        if (a = t.alternate, t.child !== null || a !== null && a.child !== null)
          for (l = dd(l); l !== null; ) {
            if (a = l[Hl]) return a;
            l = dd(l);
          }
        return t;
      }
      l = a, a = l.parentNode;
    }
    return null;
  }
  function Ja(l) {
    if (l = l[Hl] || l[Va]) {
      var t = l.tag;
      if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3)
        return l;
    }
    return null;
  }
  function xu(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l.stateNode;
    throw Error(f(33));
  }
  function wa(l) {
    var t = l[Lf];
    return t || (t = l[Lf] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), t;
  }
  function Dl(l) {
    l[Ru] = !0;
  }
  var Vf = /* @__PURE__ */ new Set(), Kf = {};
  function _a(l, t) {
    $a(l, t), $a(l + "Capture", t);
  }
  function $a(l, t) {
    for (Kf[l] = t, l = 0; l < t.length; l++)
      Vf.add(t[l]);
  }
  var dy = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), Jf = {}, wf = {};
  function yy(l) {
    return ti.call(wf, l) ? !0 : ti.call(Jf, l) ? !1 : dy.test(l) ? wf[l] = !0 : (Jf[l] = !0, !1);
  }
  function Ce(l, t, a) {
    if (yy(t))
      if (a === null) l.removeAttribute(t);
      else {
        switch (typeof a) {
          case "undefined":
          case "function":
          case "symbol":
            l.removeAttribute(t);
            return;
          case "boolean":
            var u = t.toLowerCase().slice(0, 5);
            if (u !== "data-" && u !== "aria-") {
              l.removeAttribute(t);
              return;
            }
        }
        l.setAttribute(t, "" + a);
      }
  }
  function Re(l, t, a) {
    if (a === null) l.removeAttribute(t);
    else {
      switch (typeof a) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          l.removeAttribute(t);
          return;
      }
      l.setAttribute(t, "" + a);
    }
  }
  function Nt(l, t, a, u) {
    if (u === null) l.removeAttribute(a);
    else {
      switch (typeof u) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          l.removeAttribute(a);
          return;
      }
      l.setAttributeNS(t, a, "" + u);
    }
  }
  function ft(l) {
    switch (typeof l) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return l;
      case "object":
        return l;
      default:
        return "";
    }
  }
  function $f(l) {
    var t = l.type;
    return (l = l.nodeName) && l.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function my(l, t, a) {
    var u = Object.getOwnPropertyDescriptor(
      l.constructor.prototype,
      t
    );
    if (!l.hasOwnProperty(t) && typeof u < "u" && typeof u.get == "function" && typeof u.set == "function") {
      var e = u.get, n = u.set;
      return Object.defineProperty(l, t, {
        configurable: !0,
        get: function() {
          return e.call(this);
        },
        set: function(i) {
          a = "" + i, n.call(this, i);
        }
      }), Object.defineProperty(l, t, {
        enumerable: u.enumerable
      }), {
        getValue: function() {
          return a;
        },
        setValue: function(i) {
          a = "" + i;
        },
        stopTracking: function() {
          l._valueTracker = null, delete l[t];
        }
      };
    }
  }
  function si(l) {
    if (!l._valueTracker) {
      var t = $f(l) ? "checked" : "value";
      l._valueTracker = my(
        l,
        t,
        "" + l[t]
      );
    }
  }
  function Wf(l) {
    if (!l) return !1;
    var t = l._valueTracker;
    if (!t) return !0;
    var a = t.getValue(), u = "";
    return l && (u = $f(l) ? l.checked ? "true" : "false" : l.value), l = u, l !== a ? (t.setValue(l), !0) : !1;
  }
  function xe(l) {
    if (l = l || (typeof document < "u" ? document : void 0), typeof l > "u") return null;
    try {
      return l.activeElement || l.body;
    } catch {
      return l.body;
    }
  }
  var vy = /[\n"\\]/g;
  function st(l) {
    return l.replace(
      vy,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function oi(l, t, a, u, e, n, i, c) {
    l.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? l.type = i : l.removeAttribute("type"), t != null ? i === "number" ? (t === 0 && l.value === "" || l.value != t) && (l.value = "" + ft(t)) : l.value !== "" + ft(t) && (l.value = "" + ft(t)) : i !== "submit" && i !== "reset" || l.removeAttribute("value"), t != null ? di(l, i, ft(t)) : a != null ? di(l, i, ft(a)) : u != null && l.removeAttribute("value"), e == null && n != null && (l.defaultChecked = !!n), e != null && (l.checked = e && typeof e != "function" && typeof e != "symbol"), c != null && typeof c != "function" && typeof c != "symbol" && typeof c != "boolean" ? l.name = "" + ft(c) : l.removeAttribute("name");
  }
  function kf(l, t, a, u, e, n, i, c) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (l.type = n), t != null || a != null) {
      if (!(n !== "submit" && n !== "reset" || t != null)) {
        si(l);
        return;
      }
      a = a != null ? "" + ft(a) : "", t = t != null ? "" + ft(t) : a, c || t === l.value || (l.value = t), l.defaultValue = t;
    }
    u = u ?? e, u = typeof u != "function" && typeof u != "symbol" && !!u, l.checked = c ? l.checked : !!u, l.defaultChecked = !!u, i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" && (l.name = i), si(l);
  }
  function di(l, t, a) {
    t === "number" && xe(l.ownerDocument) === l || l.defaultValue === "" + a || (l.defaultValue = "" + a);
  }
  function Wa(l, t, a, u) {
    if (l = l.options, t) {
      t = {};
      for (var e = 0; e < a.length; e++)
        t["$" + a[e]] = !0;
      for (a = 0; a < l.length; a++)
        e = t.hasOwnProperty("$" + l[a].value), l[a].selected !== e && (l[a].selected = e), e && u && (l[a].defaultSelected = !0);
    } else {
      for (a = "" + ft(a), t = null, e = 0; e < l.length; e++) {
        if (l[e].value === a) {
          l[e].selected = !0, u && (l[e].defaultSelected = !0);
          return;
        }
        t !== null || l[e].disabled || (t = l[e]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function Ff(l, t, a) {
    if (t != null && (t = "" + ft(t), t !== l.value && (l.value = t), a == null)) {
      l.defaultValue !== t && (l.defaultValue = t);
      return;
    }
    l.defaultValue = a != null ? "" + ft(a) : "";
  }
  function If(l, t, a, u) {
    if (t == null) {
      if (u != null) {
        if (a != null) throw Error(f(92));
        if (St(u)) {
          if (1 < u.length) throw Error(f(93));
          u = u[0];
        }
        a = u;
      }
      a == null && (a = ""), t = a;
    }
    a = ft(t), l.defaultValue = a, u = l.textContent, u === a && u !== "" && u !== null && (l.value = u), si(l);
  }
  function ka(l, t) {
    if (t) {
      var a = l.firstChild;
      if (a && a === l.lastChild && a.nodeType === 3) {
        a.nodeValue = t;
        return;
      }
    }
    l.textContent = t;
  }
  var hy = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function Pf(l, t, a) {
    var u = t.indexOf("--") === 0;
    a == null || typeof a == "boolean" || a === "" ? u ? l.setProperty(t, "") : t === "float" ? l.cssFloat = "" : l[t] = "" : u ? l.setProperty(t, a) : typeof a != "number" || a === 0 || hy.has(t) ? t === "float" ? l.cssFloat = a : l[t] = ("" + a).trim() : l[t] = a + "px";
  }
  function ls(l, t, a) {
    if (t != null && typeof t != "object")
      throw Error(f(62));
    if (l = l.style, a != null) {
      for (var u in a)
        !a.hasOwnProperty(u) || t != null && t.hasOwnProperty(u) || (u.indexOf("--") === 0 ? l.setProperty(u, "") : u === "float" ? l.cssFloat = "" : l[u] = "");
      for (var e in t)
        u = t[e], t.hasOwnProperty(e) && a[e] !== u && Pf(l, e, u);
    } else
      for (var n in t)
        t.hasOwnProperty(n) && Pf(l, n, t[n]);
  }
  function yi(l) {
    if (l.indexOf("-") === -1) return !1;
    switch (l) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  var ry = /* @__PURE__ */ new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]), gy = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function qe(l) {
    return gy.test("" + l) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : l;
  }
  function Ht() {
  }
  var mi = null;
  function vi(l) {
    return l = l.target || l.srcElement || window, l.correspondingUseElement && (l = l.correspondingUseElement), l.nodeType === 3 ? l.parentNode : l;
  }
  var Fa = null, Ia = null;
  function ts(l) {
    var t = Ja(l);
    if (t && (l = t.stateNode)) {
      var a = l[Vl] || null;
      l: switch (l = t.stateNode, t.type) {
        case "input":
          if (oi(
            l,
            a.value,
            a.defaultValue,
            a.defaultValue,
            a.checked,
            a.defaultChecked,
            a.type,
            a.name
          ), t = a.name, a.type === "radio" && t != null) {
            for (a = l; a.parentNode; ) a = a.parentNode;
            for (a = a.querySelectorAll(
              'input[name="' + st(
                "" + t
              ) + '"][type="radio"]'
            ), t = 0; t < a.length; t++) {
              var u = a[t];
              if (u !== l && u.form === l.form) {
                var e = u[Vl] || null;
                if (!e) throw Error(f(90));
                oi(
                  u,
                  e.value,
                  e.defaultValue,
                  e.defaultValue,
                  e.checked,
                  e.defaultChecked,
                  e.type,
                  e.name
                );
              }
            }
            for (t = 0; t < a.length; t++)
              u = a[t], u.form === l.form && Wf(u);
          }
          break l;
        case "textarea":
          Ff(l, a.value, a.defaultValue);
          break l;
        case "select":
          t = a.value, t != null && Wa(l, !!a.multiple, t, !1);
      }
    }
  }
  var hi = !1;
  function as(l, t, a) {
    if (hi) return l(t, a);
    hi = !0;
    try {
      var u = l(t);
      return u;
    } finally {
      if (hi = !1, (Fa !== null || Ia !== null) && (pn(), Fa && (t = Fa, l = Ia, Ia = Fa = null, ts(t), l)))
        for (t = 0; t < l.length; t++) ts(l[t]);
    }
  }
  function qu(l, t) {
    var a = l.stateNode;
    if (a === null) return null;
    var u = a[Vl] || null;
    if (u === null) return null;
    a = u[t];
    l: switch (t) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (u = !u.disabled) || (l = l.type, u = !(l === "button" || l === "input" || l === "select" || l === "textarea")), l = !u;
        break l;
      default:
        l = !1;
    }
    if (l) return null;
    if (a && typeof a != "function")
      throw Error(
        f(231, t, typeof a)
      );
    return a;
  }
  var Ct = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), ri = !1;
  if (Ct)
    try {
      var Bu = {};
      Object.defineProperty(Bu, "passive", {
        get: function() {
          ri = !0;
        }
      }), window.addEventListener("test", Bu, Bu), window.removeEventListener("test", Bu, Bu);
    } catch {
      ri = !1;
    }
  var It = null, gi = null, Be = null;
  function us() {
    if (Be) return Be;
    var l, t = gi, a = t.length, u, e = "value" in It ? It.value : It.textContent, n = e.length;
    for (l = 0; l < a && t[l] === e[l]; l++) ;
    var i = a - l;
    for (u = 1; u <= i && t[a - u] === e[n - u]; u++) ;
    return Be = e.slice(l, 1 < u ? 1 - u : void 0);
  }
  function Ye(l) {
    var t = l.keyCode;
    return "charCode" in l ? (l = l.charCode, l === 0 && t === 13 && (l = 13)) : l = t, l === 10 && (l = 13), 32 <= l || l === 13 ? l : 0;
  }
  function je() {
    return !0;
  }
  function es() {
    return !1;
  }
  function Kl(l) {
    function t(a, u, e, n, i) {
      this._reactName = a, this._targetInst = e, this.type = u, this.nativeEvent = n, this.target = i, this.currentTarget = null;
      for (var c in l)
        l.hasOwnProperty(c) && (a = l[c], this[c] = a ? a(n) : n[c]);
      return this.isDefaultPrevented = (n.defaultPrevented != null ? n.defaultPrevented : n.returnValue === !1) ? je : es, this.isPropagationStopped = es, this;
    }
    return q(t.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var a = this.nativeEvent;
        a && (a.preventDefault ? a.preventDefault() : typeof a.returnValue != "unknown" && (a.returnValue = !1), this.isDefaultPrevented = je);
      },
      stopPropagation: function() {
        var a = this.nativeEvent;
        a && (a.stopPropagation ? a.stopPropagation() : typeof a.cancelBubble != "unknown" && (a.cancelBubble = !0), this.isPropagationStopped = je);
      },
      persist: function() {
      },
      isPersistent: je
    }), t;
  }
  var Oa = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(l) {
      return l.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, Ge = Kl(Oa), Yu = q({}, Oa, { view: 0, detail: 0 }), Sy = Kl(Yu), Si, bi, ju, Xe = q({}, Yu, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: Ei,
    button: 0,
    buttons: 0,
    relatedTarget: function(l) {
      return l.relatedTarget === void 0 ? l.fromElement === l.srcElement ? l.toElement : l.fromElement : l.relatedTarget;
    },
    movementX: function(l) {
      return "movementX" in l ? l.movementX : (l !== ju && (ju && l.type === "mousemove" ? (Si = l.screenX - ju.screenX, bi = l.screenY - ju.screenY) : bi = Si = 0, ju = l), Si);
    },
    movementY: function(l) {
      return "movementY" in l ? l.movementY : bi;
    }
  }), ns = Kl(Xe), by = q({}, Xe, { dataTransfer: 0 }), zy = Kl(by), Ey = q({}, Yu, { relatedTarget: 0 }), zi = Kl(Ey), Ty = q({}, Oa, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), py = Kl(Ty), Ay = q({}, Oa, {
    clipboardData: function(l) {
      return "clipboardData" in l ? l.clipboardData : window.clipboardData;
    }
  }), _y = Kl(Ay), Oy = q({}, Oa, { data: 0 }), is = Kl(Oy), My = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, Dy = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, Uy = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function Ny(l) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(l) : (l = Uy[l]) ? !!t[l] : !1;
  }
  function Ei() {
    return Ny;
  }
  var Hy = q({}, Yu, {
    key: function(l) {
      if (l.key) {
        var t = My[l.key] || l.key;
        if (t !== "Unidentified") return t;
      }
      return l.type === "keypress" ? (l = Ye(l), l === 13 ? "Enter" : String.fromCharCode(l)) : l.type === "keydown" || l.type === "keyup" ? Dy[l.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: Ei,
    charCode: function(l) {
      return l.type === "keypress" ? Ye(l) : 0;
    },
    keyCode: function(l) {
      return l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    },
    which: function(l) {
      return l.type === "keypress" ? Ye(l) : l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    }
  }), Cy = Kl(Hy), Ry = q({}, Xe, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  }), cs = Kl(Ry), xy = q({}, Yu, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: Ei
  }), qy = Kl(xy), By = q({}, Oa, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), Yy = Kl(By), jy = q({}, Xe, {
    deltaX: function(l) {
      return "deltaX" in l ? l.deltaX : "wheelDeltaX" in l ? -l.wheelDeltaX : 0;
    },
    deltaY: function(l) {
      return "deltaY" in l ? l.deltaY : "wheelDeltaY" in l ? -l.wheelDeltaY : "wheelDelta" in l ? -l.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Gy = Kl(jy), Xy = q({}, Oa, {
    newState: 0,
    oldState: 0
  }), Qy = Kl(Xy), Zy = [9, 13, 27, 32], Ti = Ct && "CompositionEvent" in window, Gu = null;
  Ct && "documentMode" in document && (Gu = document.documentMode);
  var Ly = Ct && "TextEvent" in window && !Gu, fs = Ct && (!Ti || Gu && 8 < Gu && 11 >= Gu), ss = " ", os = !1;
  function ds(l, t) {
    switch (l) {
      case "keyup":
        return Zy.indexOf(t.keyCode) !== -1;
      case "keydown":
        return t.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function ys(l) {
    return l = l.detail, typeof l == "object" && "data" in l ? l.data : null;
  }
  var Pa = !1;
  function Vy(l, t) {
    switch (l) {
      case "compositionend":
        return ys(t);
      case "keypress":
        return t.which !== 32 ? null : (os = !0, ss);
      case "textInput":
        return l = t.data, l === ss && os ? null : l;
      default:
        return null;
    }
  }
  function Ky(l, t) {
    if (Pa)
      return l === "compositionend" || !Ti && ds(l, t) ? (l = us(), Be = gi = It = null, Pa = !1, l) : null;
    switch (l) {
      case "paste":
        return null;
      case "keypress":
        if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
          if (t.char && 1 < t.char.length)
            return t.char;
          if (t.which) return String.fromCharCode(t.which);
        }
        return null;
      case "compositionend":
        return fs && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var Jy = {
    color: !0,
    date: !0,
    datetime: !0,
    "datetime-local": !0,
    email: !0,
    month: !0,
    number: !0,
    password: !0,
    range: !0,
    search: !0,
    tel: !0,
    text: !0,
    time: !0,
    url: !0,
    week: !0
  };
  function ms(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t === "input" ? !!Jy[l.type] : t === "textarea";
  }
  function vs(l, t, a, u) {
    Fa ? Ia ? Ia.push(u) : Ia = [u] : Fa = u, t = Nn(t, "onChange"), 0 < t.length && (a = new Ge(
      "onChange",
      "change",
      null,
      a,
      u
    ), l.push({ event: a, listeners: t }));
  }
  var Xu = null, Qu = null;
  function wy(l) {
    F0(l, 0);
  }
  function Qe(l) {
    var t = xu(l);
    if (Wf(t)) return l;
  }
  function hs(l, t) {
    if (l === "change") return t;
  }
  var rs = !1;
  if (Ct) {
    var pi;
    if (Ct) {
      var Ai = "oninput" in document;
      if (!Ai) {
        var gs = document.createElement("div");
        gs.setAttribute("oninput", "return;"), Ai = typeof gs.oninput == "function";
      }
      pi = Ai;
    } else pi = !1;
    rs = pi && (!document.documentMode || 9 < document.documentMode);
  }
  function Ss() {
    Xu && (Xu.detachEvent("onpropertychange", bs), Qu = Xu = null);
  }
  function bs(l) {
    if (l.propertyName === "value" && Qe(Qu)) {
      var t = [];
      vs(
        t,
        Qu,
        l,
        vi(l)
      ), as(wy, t);
    }
  }
  function $y(l, t, a) {
    l === "focusin" ? (Ss(), Xu = t, Qu = a, Xu.attachEvent("onpropertychange", bs)) : l === "focusout" && Ss();
  }
  function Wy(l) {
    if (l === "selectionchange" || l === "keyup" || l === "keydown")
      return Qe(Qu);
  }
  function ky(l, t) {
    if (l === "click") return Qe(t);
  }
  function Fy(l, t) {
    if (l === "input" || l === "change")
      return Qe(t);
  }
  function Iy(l, t) {
    return l === t && (l !== 0 || 1 / l === 1 / t) || l !== l && t !== t;
  }
  var lt = typeof Object.is == "function" ? Object.is : Iy;
  function Zu(l, t) {
    if (lt(l, t)) return !0;
    if (typeof l != "object" || l === null || typeof t != "object" || t === null)
      return !1;
    var a = Object.keys(l), u = Object.keys(t);
    if (a.length !== u.length) return !1;
    for (u = 0; u < a.length; u++) {
      var e = a[u];
      if (!ti.call(t, e) || !lt(l[e], t[e]))
        return !1;
    }
    return !0;
  }
  function zs(l) {
    for (; l && l.firstChild; ) l = l.firstChild;
    return l;
  }
  function Es(l, t) {
    var a = zs(l);
    l = 0;
    for (var u; a; ) {
      if (a.nodeType === 3) {
        if (u = l + a.textContent.length, l <= t && u >= t)
          return { node: a, offset: t - l };
        l = u;
      }
      l: {
        for (; a; ) {
          if (a.nextSibling) {
            a = a.nextSibling;
            break l;
          }
          a = a.parentNode;
        }
        a = void 0;
      }
      a = zs(a);
    }
  }
  function Ts(l, t) {
    return l && t ? l === t ? !0 : l && l.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Ts(l, t.parentNode) : "contains" in l ? l.contains(t) : l.compareDocumentPosition ? !!(l.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function ps(l) {
    l = l != null && l.ownerDocument != null && l.ownerDocument.defaultView != null ? l.ownerDocument.defaultView : window;
    for (var t = xe(l.document); t instanceof l.HTMLIFrameElement; ) {
      try {
        var a = typeof t.contentWindow.location.href == "string";
      } catch {
        a = !1;
      }
      if (a) l = t.contentWindow;
      else break;
      t = xe(l.document);
    }
    return t;
  }
  function _i(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t && (t === "input" && (l.type === "text" || l.type === "search" || l.type === "tel" || l.type === "url" || l.type === "password") || t === "textarea" || l.contentEditable === "true");
  }
  var Py = Ct && "documentMode" in document && 11 >= document.documentMode, lu = null, Oi = null, Lu = null, Mi = !1;
  function As(l, t, a) {
    var u = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    Mi || lu == null || lu !== xe(u) || (u = lu, "selectionStart" in u && _i(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = {
      anchorNode: u.anchorNode,
      anchorOffset: u.anchorOffset,
      focusNode: u.focusNode,
      focusOffset: u.focusOffset
    }), Lu && Zu(Lu, u) || (Lu = u, u = Nn(Oi, "onSelect"), 0 < u.length && (t = new Ge(
      "onSelect",
      "select",
      null,
      t,
      a
    ), l.push({ event: t, listeners: u }), t.target = lu)));
  }
  function Ma(l, t) {
    var a = {};
    return a[l.toLowerCase()] = t.toLowerCase(), a["Webkit" + l] = "webkit" + t, a["Moz" + l] = "moz" + t, a;
  }
  var tu = {
    animationend: Ma("Animation", "AnimationEnd"),
    animationiteration: Ma("Animation", "AnimationIteration"),
    animationstart: Ma("Animation", "AnimationStart"),
    transitionrun: Ma("Transition", "TransitionRun"),
    transitionstart: Ma("Transition", "TransitionStart"),
    transitioncancel: Ma("Transition", "TransitionCancel"),
    transitionend: Ma("Transition", "TransitionEnd")
  }, Di = {}, _s = {};
  Ct && (_s = document.createElement("div").style, "AnimationEvent" in window || (delete tu.animationend.animation, delete tu.animationiteration.animation, delete tu.animationstart.animation), "TransitionEvent" in window || delete tu.transitionend.transition);
  function Da(l) {
    if (Di[l]) return Di[l];
    if (!tu[l]) return l;
    var t = tu[l], a;
    for (a in t)
      if (t.hasOwnProperty(a) && a in _s)
        return Di[l] = t[a];
    return l;
  }
  var Os = Da("animationend"), Ms = Da("animationiteration"), Ds = Da("animationstart"), lm = Da("transitionrun"), tm = Da("transitionstart"), am = Da("transitioncancel"), Us = Da("transitionend"), Ns = /* @__PURE__ */ new Map(), Ui = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  Ui.push("scrollEnd");
  function bt(l, t) {
    Ns.set(l, t), _a(t, [l]);
  }
  var Ze = typeof reportError == "function" ? reportError : function(l) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var t = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof l == "object" && l !== null && typeof l.message == "string" ? String(l.message) : String(l),
        error: l
      });
      if (!window.dispatchEvent(t)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", l);
      return;
    }
    console.error(l);
  }, ot = [], au = 0, Ni = 0;
  function Le() {
    for (var l = au, t = Ni = au = 0; t < l; ) {
      var a = ot[t];
      ot[t++] = null;
      var u = ot[t];
      ot[t++] = null;
      var e = ot[t];
      ot[t++] = null;
      var n = ot[t];
      if (ot[t++] = null, u !== null && e !== null) {
        var i = u.pending;
        i === null ? e.next = e : (e.next = i.next, i.next = e), u.pending = e;
      }
      n !== 0 && Hs(a, e, n);
    }
  }
  function Ve(l, t, a, u) {
    ot[au++] = l, ot[au++] = t, ot[au++] = a, ot[au++] = u, Ni |= u, l.lanes |= u, l = l.alternate, l !== null && (l.lanes |= u);
  }
  function Hi(l, t, a, u) {
    return Ve(l, t, a, u), Ke(l);
  }
  function Ua(l, t) {
    return Ve(l, null, null, t), Ke(l);
  }
  function Hs(l, t, a) {
    l.lanes |= a;
    var u = l.alternate;
    u !== null && (u.lanes |= a);
    for (var e = !1, n = l.return; n !== null; )
      n.childLanes |= a, u = n.alternate, u !== null && (u.childLanes |= a), n.tag === 22 && (l = n.stateNode, l === null || l._visibility & 1 || (e = !0)), l = n, n = n.return;
    return l.tag === 3 ? (n = l.stateNode, e && t !== null && (e = 31 - Pl(a), l = n.hiddenUpdates, u = l[e], u === null ? l[e] = [t] : u.push(t), t.lane = a | 536870912), n) : null;
  }
  function Ke(l) {
    if (50 < de)
      throw de = 0, Xc = null, Error(f(185));
    for (var t = l.return; t !== null; )
      l = t, t = l.return;
    return l.tag === 3 ? l.stateNode : null;
  }
  var uu = {};
  function um(l, t, a, u) {
    this.tag = l, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function tt(l, t, a, u) {
    return new um(l, t, a, u);
  }
  function Ci(l) {
    return l = l.prototype, !(!l || !l.isReactComponent);
  }
  function Rt(l, t) {
    var a = l.alternate;
    return a === null ? (a = tt(
      l.tag,
      t,
      l.key,
      l.mode
    ), a.elementType = l.elementType, a.type = l.type, a.stateNode = l.stateNode, a.alternate = l, l.alternate = a) : (a.pendingProps = t, a.type = l.type, a.flags = 0, a.subtreeFlags = 0, a.deletions = null), a.flags = l.flags & 65011712, a.childLanes = l.childLanes, a.lanes = l.lanes, a.child = l.child, a.memoizedProps = l.memoizedProps, a.memoizedState = l.memoizedState, a.updateQueue = l.updateQueue, t = l.dependencies, a.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, a.sibling = l.sibling, a.index = l.index, a.ref = l.ref, a.refCleanup = l.refCleanup, a;
  }
  function Cs(l, t) {
    l.flags &= 65011714;
    var a = l.alternate;
    return a === null ? (l.childLanes = 0, l.lanes = t, l.child = null, l.subtreeFlags = 0, l.memoizedProps = null, l.memoizedState = null, l.updateQueue = null, l.dependencies = null, l.stateNode = null) : (l.childLanes = a.childLanes, l.lanes = a.lanes, l.child = a.child, l.subtreeFlags = 0, l.deletions = null, l.memoizedProps = a.memoizedProps, l.memoizedState = a.memoizedState, l.updateQueue = a.updateQueue, l.type = a.type, t = a.dependencies, l.dependencies = t === null ? null : {
      lanes: t.lanes,
      firstContext: t.firstContext
    }), l;
  }
  function Je(l, t, a, u, e, n) {
    var i = 0;
    if (u = l, typeof l == "function") Ci(l) && (i = 1);
    else if (typeof l == "string")
      i = fv(
        l,
        a,
        H.current
      ) ? 26 : l === "html" || l === "head" || l === "body" ? 27 : 5;
    else
      l: switch (l) {
        case pt:
          return l = tt(31, a, t, e), l.elementType = pt, l.lanes = n, l;
        case Ml:
          return Na(a.children, e, n, t);
        case Xl:
          i = 8, e |= 24;
          break;
        case _l:
          return l = tt(12, a, t, e | 2), l.elementType = _l, l.lanes = n, l;
        case Tt:
          return l = tt(13, a, t, e), l.elementType = Tt, l.lanes = n, l;
        case Ql:
          return l = tt(19, a, t, e), l.elementType = Ql, l.lanes = n, l;
        default:
          if (typeof l == "object" && l !== null)
            switch (l.$$typeof) {
              case Bl:
                i = 10;
                break l;
              case Wt:
                i = 9;
                break l;
              case ct:
                i = 11;
                break l;
              case k:
                i = 14;
                break l;
              case Zl:
                i = 16, u = null;
                break l;
            }
          i = 29, a = Error(
            f(130, l === null ? "null" : typeof l, "")
          ), u = null;
      }
    return t = tt(i, a, t, e), t.elementType = l, t.type = u, t.lanes = n, t;
  }
  function Na(l, t, a, u) {
    return l = tt(7, l, u, t), l.lanes = a, l;
  }
  function Ri(l, t, a) {
    return l = tt(6, l, null, t), l.lanes = a, l;
  }
  function Rs(l) {
    var t = tt(18, null, null, 0);
    return t.stateNode = l, t;
  }
  function xi(l, t, a) {
    return t = tt(
      4,
      l.children !== null ? l.children : [],
      l.key,
      t
    ), t.lanes = a, t.stateNode = {
      containerInfo: l.containerInfo,
      pendingChildren: null,
      implementation: l.implementation
    }, t;
  }
  var xs = /* @__PURE__ */ new WeakMap();
  function dt(l, t) {
    if (typeof l == "object" && l !== null) {
      var a = xs.get(l);
      return a !== void 0 ? a : (t = {
        value: l,
        source: t,
        stack: Rf(t)
      }, xs.set(l, t), t);
    }
    return {
      value: l,
      source: t,
      stack: Rf(t)
    };
  }
  var eu = [], nu = 0, we = null, Vu = 0, yt = [], mt = 0, Pt = null, _t = 1, Ot = "";
  function xt(l, t) {
    eu[nu++] = Vu, eu[nu++] = we, we = l, Vu = t;
  }
  function qs(l, t, a) {
    yt[mt++] = _t, yt[mt++] = Ot, yt[mt++] = Pt, Pt = l;
    var u = _t;
    l = Ot;
    var e = 32 - Pl(u) - 1;
    u &= ~(1 << e), a += 1;
    var n = 32 - Pl(t) + e;
    if (30 < n) {
      var i = e - e % 5;
      n = (u & (1 << i) - 1).toString(32), u >>= i, e -= i, _t = 1 << 32 - Pl(t) + e | a << e | u, Ot = n + l;
    } else
      _t = 1 << n | a << e | u, Ot = l;
  }
  function qi(l) {
    l.return !== null && (xt(l, 1), qs(l, 1, 0));
  }
  function Bi(l) {
    for (; l === we; )
      we = eu[--nu], eu[nu] = null, Vu = eu[--nu], eu[nu] = null;
    for (; l === Pt; )
      Pt = yt[--mt], yt[mt] = null, Ot = yt[--mt], yt[mt] = null, _t = yt[--mt], yt[mt] = null;
  }
  function Bs(l, t) {
    yt[mt++] = _t, yt[mt++] = Ot, yt[mt++] = Pt, _t = t.id, Ot = t.overflow, Pt = l;
  }
  var Cl = null, dl = null, F = !1, la = null, vt = !1, Yi = Error(f(519));
  function ta(l) {
    var t = Error(
      f(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw Ku(dt(t, l)), Yi;
  }
  function Ys(l) {
    var t = l.stateNode, a = l.type, u = l.memoizedProps;
    switch (t[Hl] = l, t[Vl] = u, a) {
      case "dialog":
        w("cancel", t), w("close", t);
        break;
      case "iframe":
      case "object":
      case "embed":
        w("load", t);
        break;
      case "video":
      case "audio":
        for (a = 0; a < me.length; a++)
          w(me[a], t);
        break;
      case "source":
        w("error", t);
        break;
      case "img":
      case "image":
      case "link":
        w("error", t), w("load", t);
        break;
      case "details":
        w("toggle", t);
        break;
      case "input":
        w("invalid", t), kf(
          t,
          u.value,
          u.defaultValue,
          u.checked,
          u.defaultChecked,
          u.type,
          u.name,
          !0
        );
        break;
      case "select":
        w("invalid", t);
        break;
      case "textarea":
        w("invalid", t), If(t, u.value, u.defaultValue, u.children);
    }
    a = u.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || t.textContent === "" + a || u.suppressHydrationWarning === !0 || td(t.textContent, a) ? (u.popover != null && (w("beforetoggle", t), w("toggle", t)), u.onScroll != null && w("scroll", t), u.onScrollEnd != null && w("scrollend", t), u.onClick != null && (t.onclick = Ht), t = !0) : t = !1, t || ta(l, !0);
  }
  function js(l) {
    for (Cl = l.return; Cl; )
      switch (Cl.tag) {
        case 5:
        case 31:
        case 13:
          vt = !1;
          return;
        case 27:
        case 3:
          vt = !0;
          return;
        default:
          Cl = Cl.return;
      }
  }
  function iu(l) {
    if (l !== Cl) return !1;
    if (!F) return js(l), F = !0, !1;
    var t = l.tag, a;
    if ((a = t !== 3 && t !== 27) && ((a = t === 5) && (a = l.type, a = !(a !== "form" && a !== "button") || tf(l.type, l.memoizedProps)), a = !a), a && dl && ta(l), js(l), t === 13) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(f(317));
      dl = od(l);
    } else if (t === 31) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(f(317));
      dl = od(l);
    } else
      t === 27 ? (t = dl, ha(l.type) ? (l = cf, cf = null, dl = l) : dl = t) : dl = Cl ? rt(l.stateNode.nextSibling) : null;
    return !0;
  }
  function Ha() {
    dl = Cl = null, F = !1;
  }
  function ji() {
    var l = la;
    return l !== null && (Wl === null ? Wl = l : Wl.push.apply(
      Wl,
      l
    ), la = null), l;
  }
  function Ku(l) {
    la === null ? la = [l] : la.push(l);
  }
  var Gi = y(null), Ca = null, qt = null;
  function aa(l, t, a) {
    D(Gi, t._currentValue), t._currentValue = a;
  }
  function Bt(l) {
    l._currentValue = Gi.current, _(Gi);
  }
  function Xi(l, t, a) {
    for (; l !== null; ) {
      var u = l.alternate;
      if ((l.childLanes & t) !== t ? (l.childLanes |= t, u !== null && (u.childLanes |= t)) : u !== null && (u.childLanes & t) !== t && (u.childLanes |= t), l === a) break;
      l = l.return;
    }
  }
  function Qi(l, t, a, u) {
    var e = l.child;
    for (e !== null && (e.return = l); e !== null; ) {
      var n = e.dependencies;
      if (n !== null) {
        var i = e.child;
        n = n.firstContext;
        l: for (; n !== null; ) {
          var c = n;
          n = e;
          for (var s = 0; s < t.length; s++)
            if (c.context === t[s]) {
              n.lanes |= a, c = n.alternate, c !== null && (c.lanes |= a), Xi(
                n.return,
                a,
                l
              ), u || (i = null);
              break l;
            }
          n = c.next;
        }
      } else if (e.tag === 18) {
        if (i = e.return, i === null) throw Error(f(341));
        i.lanes |= a, n = i.alternate, n !== null && (n.lanes |= a), Xi(i, a, l), i = null;
      } else i = e.child;
      if (i !== null) i.return = e;
      else
        for (i = e; i !== null; ) {
          if (i === l) {
            i = null;
            break;
          }
          if (e = i.sibling, e !== null) {
            e.return = i.return, i = e;
            break;
          }
          i = i.return;
        }
      e = i;
    }
  }
  function cu(l, t, a, u) {
    l = null;
    for (var e = t, n = !1; e !== null; ) {
      if (!n) {
        if ((e.flags & 524288) !== 0) n = !0;
        else if ((e.flags & 262144) !== 0) break;
      }
      if (e.tag === 10) {
        var i = e.alternate;
        if (i === null) throw Error(f(387));
        if (i = i.memoizedProps, i !== null) {
          var c = e.type;
          lt(e.pendingProps.value, i.value) || (l !== null ? l.push(c) : l = [c]);
        }
      } else if (e === tl.current) {
        if (i = e.alternate, i === null) throw Error(f(387));
        i.memoizedState.memoizedState !== e.memoizedState.memoizedState && (l !== null ? l.push(Se) : l = [Se]);
      }
      e = e.return;
    }
    l !== null && Qi(
      t,
      l,
      a,
      u
    ), t.flags |= 262144;
  }
  function $e(l) {
    for (l = l.firstContext; l !== null; ) {
      if (!lt(
        l.context._currentValue,
        l.memoizedValue
      ))
        return !0;
      l = l.next;
    }
    return !1;
  }
  function Ra(l) {
    Ca = l, qt = null, l = l.dependencies, l !== null && (l.firstContext = null);
  }
  function Rl(l) {
    return Gs(Ca, l);
  }
  function We(l, t) {
    return Ca === null && Ra(l), Gs(l, t);
  }
  function Gs(l, t) {
    var a = t._currentValue;
    if (t = { context: t, memoizedValue: a, next: null }, qt === null) {
      if (l === null) throw Error(f(308));
      qt = t, l.dependencies = { lanes: 0, firstContext: t }, l.flags |= 524288;
    } else qt = qt.next = t;
    return a;
  }
  var em = typeof AbortController < "u" ? AbortController : function() {
    var l = [], t = this.signal = {
      aborted: !1,
      addEventListener: function(a, u) {
        l.push(u);
      }
    };
    this.abort = function() {
      t.aborted = !0, l.forEach(function(a) {
        return a();
      });
    };
  }, nm = o.unstable_scheduleCallback, im = o.unstable_NormalPriority, El = {
    $$typeof: Bl,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Zi() {
    return {
      controller: new em(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function Ju(l) {
    l.refCount--, l.refCount === 0 && nm(im, function() {
      l.controller.abort();
    });
  }
  var wu = null, Li = 0, fu = 0, su = null;
  function cm(l, t) {
    if (wu === null) {
      var a = wu = [];
      Li = 0, fu = Jc(), su = {
        status: "pending",
        value: void 0,
        then: function(u) {
          a.push(u);
        }
      };
    }
    return Li++, t.then(Xs, Xs), t;
  }
  function Xs() {
    if (--Li === 0 && wu !== null) {
      su !== null && (su.status = "fulfilled");
      var l = wu;
      wu = null, fu = 0, su = null;
      for (var t = 0; t < l.length; t++) (0, l[t])();
    }
  }
  function fm(l, t) {
    var a = [], u = {
      status: "pending",
      value: null,
      reason: null,
      then: function(e) {
        a.push(e);
      }
    };
    return l.then(
      function() {
        u.status = "fulfilled", u.value = t;
        for (var e = 0; e < a.length; e++) (0, a[e])(t);
      },
      function(e) {
        for (u.status = "rejected", u.reason = e, e = 0; e < a.length; e++)
          (0, a[e])(void 0);
      }
    ), u;
  }
  var Qs = E.S;
  E.S = function(l, t) {
    _0 = Fl(), typeof t == "object" && t !== null && typeof t.then == "function" && cm(l, t), Qs !== null && Qs(l, t);
  };
  var xa = y(null);
  function Vi() {
    var l = xa.current;
    return l !== null ? l : ol.pooledCache;
  }
  function ke(l, t) {
    t === null ? D(xa, xa.current) : D(xa, t.pool);
  }
  function Zs() {
    var l = Vi();
    return l === null ? null : { parent: El._currentValue, pool: l };
  }
  var ou = Error(f(460)), Ki = Error(f(474)), Fe = Error(f(542)), Ie = { then: function() {
  } };
  function Ls(l) {
    return l = l.status, l === "fulfilled" || l === "rejected";
  }
  function Vs(l, t, a) {
    switch (a = l[a], a === void 0 ? l.push(t) : a !== t && (t.then(Ht, Ht), t = a), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw l = t.reason, Js(l), l;
      default:
        if (typeof t.status == "string") t.then(Ht, Ht);
        else {
          if (l = ol, l !== null && 100 < l.shellSuspendCounter)
            throw Error(f(482));
          l = t, l.status = "pending", l.then(
            function(u) {
              if (t.status === "pending") {
                var e = t;
                e.status = "fulfilled", e.value = u;
              }
            },
            function(u) {
              if (t.status === "pending") {
                var e = t;
                e.status = "rejected", e.reason = u;
              }
            }
          );
        }
        switch (t.status) {
          case "fulfilled":
            return t.value;
          case "rejected":
            throw l = t.reason, Js(l), l;
        }
        throw Ba = t, ou;
    }
  }
  function qa(l) {
    try {
      var t = l._init;
      return t(l._payload);
    } catch (a) {
      throw a !== null && typeof a == "object" && typeof a.then == "function" ? (Ba = a, ou) : a;
    }
  }
  var Ba = null;
  function Ks() {
    if (Ba === null) throw Error(f(459));
    var l = Ba;
    return Ba = null, l;
  }
  function Js(l) {
    if (l === ou || l === Fe)
      throw Error(f(483));
  }
  var du = null, $u = 0;
  function Pe(l) {
    var t = $u;
    return $u += 1, du === null && (du = []), Vs(du, l, t);
  }
  function Wu(l, t) {
    t = t.props.ref, l.ref = t !== void 0 ? t : null;
  }
  function ln(l, t) {
    throw t.$$typeof === fl ? Error(f(525)) : (l = Object.prototype.toString.call(t), Error(
      f(
        31,
        l === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : l
      )
    ));
  }
  function ws(l) {
    function t(m, d) {
      if (l) {
        var h = m.deletions;
        h === null ? (m.deletions = [d], m.flags |= 16) : h.push(d);
      }
    }
    function a(m, d) {
      if (!l) return null;
      for (; d !== null; )
        t(m, d), d = d.sibling;
      return null;
    }
    function u(m) {
      for (var d = /* @__PURE__ */ new Map(); m !== null; )
        m.key !== null ? d.set(m.key, m) : d.set(m.index, m), m = m.sibling;
      return d;
    }
    function e(m, d) {
      return m = Rt(m, d), m.index = 0, m.sibling = null, m;
    }
    function n(m, d, h) {
      return m.index = h, l ? (h = m.alternate, h !== null ? (h = h.index, h < d ? (m.flags |= 67108866, d) : h) : (m.flags |= 67108866, d)) : (m.flags |= 1048576, d);
    }
    function i(m) {
      return l && m.alternate === null && (m.flags |= 67108866), m;
    }
    function c(m, d, h, T) {
      return d === null || d.tag !== 6 ? (d = Ri(h, m.mode, T), d.return = m, d) : (d = e(d, h), d.return = m, d);
    }
    function s(m, d, h, T) {
      var x = h.type;
      return x === Ml ? z(
        m,
        d,
        h.props.children,
        T,
        h.key
      ) : d !== null && (d.elementType === x || typeof x == "object" && x !== null && x.$$typeof === Zl && qa(x) === d.type) ? (d = e(d, h.props), Wu(d, h), d.return = m, d) : (d = Je(
        h.type,
        h.key,
        h.props,
        null,
        m.mode,
        T
      ), Wu(d, h), d.return = m, d);
    }
    function r(m, d, h, T) {
      return d === null || d.tag !== 4 || d.stateNode.containerInfo !== h.containerInfo || d.stateNode.implementation !== h.implementation ? (d = xi(h, m.mode, T), d.return = m, d) : (d = e(d, h.children || []), d.return = m, d);
    }
    function z(m, d, h, T, x) {
      return d === null || d.tag !== 7 ? (d = Na(
        h,
        m.mode,
        T,
        x
      ), d.return = m, d) : (d = e(d, h), d.return = m, d);
    }
    function A(m, d, h) {
      if (typeof d == "string" && d !== "" || typeof d == "number" || typeof d == "bigint")
        return d = Ri(
          "" + d,
          m.mode,
          h
        ), d.return = m, d;
      if (typeof d == "object" && d !== null) {
        switch (d.$$typeof) {
          case zl:
            return h = Je(
              d.type,
              d.key,
              d.props,
              null,
              m.mode,
              h
            ), Wu(h, d), h.return = m, h;
          case Nl:
            return d = xi(
              d,
              m.mode,
              h
            ), d.return = m, d;
          case Zl:
            return d = qa(d), A(m, d, h);
        }
        if (St(d) || Ll(d))
          return d = Na(
            d,
            m.mode,
            h,
            null
          ), d.return = m, d;
        if (typeof d.then == "function")
          return A(m, Pe(d), h);
        if (d.$$typeof === Bl)
          return A(
            m,
            We(m, d),
            h
          );
        ln(m, d);
      }
      return null;
    }
    function g(m, d, h, T) {
      var x = d !== null ? d.key : null;
      if (typeof h == "string" && h !== "" || typeof h == "number" || typeof h == "bigint")
        return x !== null ? null : c(m, d, "" + h, T);
      if (typeof h == "object" && h !== null) {
        switch (h.$$typeof) {
          case zl:
            return h.key === x ? s(m, d, h, T) : null;
          case Nl:
            return h.key === x ? r(m, d, h, T) : null;
          case Zl:
            return h = qa(h), g(m, d, h, T);
        }
        if (St(h) || Ll(h))
          return x !== null ? null : z(m, d, h, T, null);
        if (typeof h.then == "function")
          return g(
            m,
            d,
            Pe(h),
            T
          );
        if (h.$$typeof === Bl)
          return g(
            m,
            d,
            We(m, h),
            T
          );
        ln(m, h);
      }
      return null;
    }
    function b(m, d, h, T, x) {
      if (typeof T == "string" && T !== "" || typeof T == "number" || typeof T == "bigint")
        return m = m.get(h) || null, c(d, m, "" + T, x);
      if (typeof T == "object" && T !== null) {
        switch (T.$$typeof) {
          case zl:
            return m = m.get(
              T.key === null ? h : T.key
            ) || null, s(d, m, T, x);
          case Nl:
            return m = m.get(
              T.key === null ? h : T.key
            ) || null, r(d, m, T, x);
          case Zl:
            return T = qa(T), b(
              m,
              d,
              h,
              T,
              x
            );
        }
        if (St(T) || Ll(T))
          return m = m.get(h) || null, z(d, m, T, x, null);
        if (typeof T.then == "function")
          return b(
            m,
            d,
            h,
            Pe(T),
            x
          );
        if (T.$$typeof === Bl)
          return b(
            m,
            d,
            h,
            We(d, T),
            x
          );
        ln(d, T);
      }
      return null;
    }
    function N(m, d, h, T) {
      for (var x = null, I = null, C = d, L = d = 0, W = null; C !== null && L < h.length; L++) {
        C.index > L ? (W = C, C = null) : W = C.sibling;
        var P = g(
          m,
          C,
          h[L],
          T
        );
        if (P === null) {
          C === null && (C = W);
          break;
        }
        l && C && P.alternate === null && t(m, C), d = n(P, d, L), I === null ? x = P : I.sibling = P, I = P, C = W;
      }
      if (L === h.length)
        return a(m, C), F && xt(m, L), x;
      if (C === null) {
        for (; L < h.length; L++)
          C = A(m, h[L], T), C !== null && (d = n(
            C,
            d,
            L
          ), I === null ? x = C : I.sibling = C, I = C);
        return F && xt(m, L), x;
      }
      for (C = u(C); L < h.length; L++)
        W = b(
          C,
          m,
          L,
          h[L],
          T
        ), W !== null && (l && W.alternate !== null && C.delete(
          W.key === null ? L : W.key
        ), d = n(
          W,
          d,
          L
        ), I === null ? x = W : I.sibling = W, I = W);
      return l && C.forEach(function(za) {
        return t(m, za);
      }), F && xt(m, L), x;
    }
    function B(m, d, h, T) {
      if (h == null) throw Error(f(151));
      for (var x = null, I = null, C = d, L = d = 0, W = null, P = h.next(); C !== null && !P.done; L++, P = h.next()) {
        C.index > L ? (W = C, C = null) : W = C.sibling;
        var za = g(m, C, P.value, T);
        if (za === null) {
          C === null && (C = W);
          break;
        }
        l && C && za.alternate === null && t(m, C), d = n(za, d, L), I === null ? x = za : I.sibling = za, I = za, C = W;
      }
      if (P.done)
        return a(m, C), F && xt(m, L), x;
      if (C === null) {
        for (; !P.done; L++, P = h.next())
          P = A(m, P.value, T), P !== null && (d = n(P, d, L), I === null ? x = P : I.sibling = P, I = P);
        return F && xt(m, L), x;
      }
      for (C = u(C); !P.done; L++, P = h.next())
        P = b(C, m, L, P.value, T), P !== null && (l && P.alternate !== null && C.delete(P.key === null ? L : P.key), d = n(P, d, L), I === null ? x = P : I.sibling = P, I = P);
      return l && C.forEach(function(bv) {
        return t(m, bv);
      }), F && xt(m, L), x;
    }
    function cl(m, d, h, T) {
      if (typeof h == "object" && h !== null && h.type === Ml && h.key === null && (h = h.props.children), typeof h == "object" && h !== null) {
        switch (h.$$typeof) {
          case zl:
            l: {
              for (var x = h.key; d !== null; ) {
                if (d.key === x) {
                  if (x = h.type, x === Ml) {
                    if (d.tag === 7) {
                      a(
                        m,
                        d.sibling
                      ), T = e(
                        d,
                        h.props.children
                      ), T.return = m, m = T;
                      break l;
                    }
                  } else if (d.elementType === x || typeof x == "object" && x !== null && x.$$typeof === Zl && qa(x) === d.type) {
                    a(
                      m,
                      d.sibling
                    ), T = e(d, h.props), Wu(T, h), T.return = m, m = T;
                    break l;
                  }
                  a(m, d);
                  break;
                } else t(m, d);
                d = d.sibling;
              }
              h.type === Ml ? (T = Na(
                h.props.children,
                m.mode,
                T,
                h.key
              ), T.return = m, m = T) : (T = Je(
                h.type,
                h.key,
                h.props,
                null,
                m.mode,
                T
              ), Wu(T, h), T.return = m, m = T);
            }
            return i(m);
          case Nl:
            l: {
              for (x = h.key; d !== null; ) {
                if (d.key === x)
                  if (d.tag === 4 && d.stateNode.containerInfo === h.containerInfo && d.stateNode.implementation === h.implementation) {
                    a(
                      m,
                      d.sibling
                    ), T = e(d, h.children || []), T.return = m, m = T;
                    break l;
                  } else {
                    a(m, d);
                    break;
                  }
                else t(m, d);
                d = d.sibling;
              }
              T = xi(h, m.mode, T), T.return = m, m = T;
            }
            return i(m);
          case Zl:
            return h = qa(h), cl(
              m,
              d,
              h,
              T
            );
        }
        if (St(h))
          return N(
            m,
            d,
            h,
            T
          );
        if (Ll(h)) {
          if (x = Ll(h), typeof x != "function") throw Error(f(150));
          return h = x.call(h), B(
            m,
            d,
            h,
            T
          );
        }
        if (typeof h.then == "function")
          return cl(
            m,
            d,
            Pe(h),
            T
          );
        if (h.$$typeof === Bl)
          return cl(
            m,
            d,
            We(m, h),
            T
          );
        ln(m, h);
      }
      return typeof h == "string" && h !== "" || typeof h == "number" || typeof h == "bigint" ? (h = "" + h, d !== null && d.tag === 6 ? (a(m, d.sibling), T = e(d, h), T.return = m, m = T) : (a(m, d), T = Ri(h, m.mode, T), T.return = m, m = T), i(m)) : a(m, d);
    }
    return function(m, d, h, T) {
      try {
        $u = 0;
        var x = cl(
          m,
          d,
          h,
          T
        );
        return du = null, x;
      } catch (C) {
        if (C === ou || C === Fe) throw C;
        var I = tt(29, C, null, m.mode);
        return I.lanes = T, I.return = m, I;
      } finally {
      }
    };
  }
  var Ya = ws(!0), $s = ws(!1), ua = !1;
  function Ji(l) {
    l.updateQueue = {
      baseState: l.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function wi(l, t) {
    l = l.updateQueue, t.updateQueue === l && (t.updateQueue = {
      baseState: l.baseState,
      firstBaseUpdate: l.firstBaseUpdate,
      lastBaseUpdate: l.lastBaseUpdate,
      shared: l.shared,
      callbacks: null
    });
  }
  function ea(l) {
    return { lane: l, tag: 0, payload: null, callback: null, next: null };
  }
  function na(l, t, a) {
    var u = l.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (ll & 2) !== 0) {
      var e = u.pending;
      return e === null ? t.next = t : (t.next = e.next, e.next = t), u.pending = t, t = Ke(l), Hs(l, null, a), t;
    }
    return Ve(l, u, t, a), Ke(l);
  }
  function ku(l, t, a) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (a & 4194048) !== 0)) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Gf(l, a);
    }
  }
  function $i(l, t) {
    var a = l.updateQueue, u = l.alternate;
    if (u !== null && (u = u.updateQueue, a === u)) {
      var e = null, n = null;
      if (a = a.firstBaseUpdate, a !== null) {
        do {
          var i = {
            lane: a.lane,
            tag: a.tag,
            payload: a.payload,
            callback: null,
            next: null
          };
          n === null ? e = n = i : n = n.next = i, a = a.next;
        } while (a !== null);
        n === null ? e = n = t : n = n.next = t;
      } else e = n = t;
      a = {
        baseState: u.baseState,
        firstBaseUpdate: e,
        lastBaseUpdate: n,
        shared: u.shared,
        callbacks: u.callbacks
      }, l.updateQueue = a;
      return;
    }
    l = a.lastBaseUpdate, l === null ? a.firstBaseUpdate = t : l.next = t, a.lastBaseUpdate = t;
  }
  var Wi = !1;
  function Fu() {
    if (Wi) {
      var l = su;
      if (l !== null) throw l;
    }
  }
  function Iu(l, t, a, u) {
    Wi = !1;
    var e = l.updateQueue;
    ua = !1;
    var n = e.firstBaseUpdate, i = e.lastBaseUpdate, c = e.shared.pending;
    if (c !== null) {
      e.shared.pending = null;
      var s = c, r = s.next;
      s.next = null, i === null ? n = r : i.next = r, i = s;
      var z = l.alternate;
      z !== null && (z = z.updateQueue, c = z.lastBaseUpdate, c !== i && (c === null ? z.firstBaseUpdate = r : c.next = r, z.lastBaseUpdate = s));
    }
    if (n !== null) {
      var A = e.baseState;
      i = 0, z = r = s = null, c = n;
      do {
        var g = c.lane & -536870913, b = g !== c.lane;
        if (b ? ($ & g) === g : (u & g) === g) {
          g !== 0 && g === fu && (Wi = !0), z !== null && (z = z.next = {
            lane: 0,
            tag: c.tag,
            payload: c.payload,
            callback: null,
            next: null
          });
          l: {
            var N = l, B = c;
            g = t;
            var cl = a;
            switch (B.tag) {
              case 1:
                if (N = B.payload, typeof N == "function") {
                  A = N.call(cl, A, g);
                  break l;
                }
                A = N;
                break l;
              case 3:
                N.flags = N.flags & -65537 | 128;
              case 0:
                if (N = B.payload, g = typeof N == "function" ? N.call(cl, A, g) : N, g == null) break l;
                A = q({}, A, g);
                break l;
              case 2:
                ua = !0;
            }
          }
          g = c.callback, g !== null && (l.flags |= 64, b && (l.flags |= 8192), b = e.callbacks, b === null ? e.callbacks = [g] : b.push(g));
        } else
          b = {
            lane: g,
            tag: c.tag,
            payload: c.payload,
            callback: c.callback,
            next: null
          }, z === null ? (r = z = b, s = A) : z = z.next = b, i |= g;
        if (c = c.next, c === null) {
          if (c = e.shared.pending, c === null)
            break;
          b = c, c = b.next, b.next = null, e.lastBaseUpdate = b, e.shared.pending = null;
        }
      } while (!0);
      z === null && (s = A), e.baseState = s, e.firstBaseUpdate = r, e.lastBaseUpdate = z, n === null && (e.shared.lanes = 0), oa |= i, l.lanes = i, l.memoizedState = A;
    }
  }
  function Ws(l, t) {
    if (typeof l != "function")
      throw Error(f(191, l));
    l.call(t);
  }
  function ks(l, t) {
    var a = l.callbacks;
    if (a !== null)
      for (l.callbacks = null, l = 0; l < a.length; l++)
        Ws(a[l], t);
  }
  var yu = y(null), tn = y(0);
  function Fs(l, t) {
    l = Kt, D(tn, l), D(yu, t), Kt = l | t.baseLanes;
  }
  function ki() {
    D(tn, Kt), D(yu, yu.current);
  }
  function Fi() {
    Kt = tn.current, _(yu), _(tn);
  }
  var at = y(null), ht = null;
  function ia(l) {
    var t = l.alternate;
    D(Sl, Sl.current & 1), D(at, l), ht === null && (t === null || yu.current !== null || t.memoizedState !== null) && (ht = l);
  }
  function Ii(l) {
    D(Sl, Sl.current), D(at, l), ht === null && (ht = l);
  }
  function Is(l) {
    l.tag === 22 ? (D(Sl, Sl.current), D(at, l), ht === null && (ht = l)) : ca();
  }
  function ca() {
    D(Sl, Sl.current), D(at, at.current);
  }
  function ut(l) {
    _(at), ht === l && (ht = null), _(Sl);
  }
  var Sl = y(0);
  function an(l) {
    for (var t = l; t !== null; ) {
      if (t.tag === 13) {
        var a = t.memoizedState;
        if (a !== null && (a = a.dehydrated, a === null || ef(a) || nf(a)))
          return t;
      } else if (t.tag === 19 && (t.memoizedProps.revealOrder === "forwards" || t.memoizedProps.revealOrder === "backwards" || t.memoizedProps.revealOrder === "unstable_legacy-backwards" || t.memoizedProps.revealOrder === "together")) {
        if ((t.flags & 128) !== 0) return t;
      } else if (t.child !== null) {
        t.child.return = t, t = t.child;
        continue;
      }
      if (t === l) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === l) return null;
        t = t.return;
      }
      t.sibling.return = t.return, t = t.sibling;
    }
    return null;
  }
  var Yt = 0, Z = null, nl = null, Tl = null, un = !1, mu = !1, ja = !1, en = 0, Pu = 0, vu = null, sm = 0;
  function hl() {
    throw Error(f(321));
  }
  function Pi(l, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < l.length; a++)
      if (!lt(l[a], t[a])) return !1;
    return !0;
  }
  function lc(l, t, a, u, e, n) {
    return Yt = n, Z = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, E.H = l === null || l.memoizedState === null ? Bo : hc, ja = !1, n = a(u, e), ja = !1, mu && (n = lo(
      t,
      a,
      u,
      e
    )), Ps(l), n;
  }
  function Ps(l) {
    E.H = ae;
    var t = nl !== null && nl.next !== null;
    if (Yt = 0, Tl = nl = Z = null, un = !1, Pu = 0, vu = null, t) throw Error(f(300));
    l === null || pl || (l = l.dependencies, l !== null && $e(l) && (pl = !0));
  }
  function lo(l, t, a, u) {
    Z = l;
    var e = 0;
    do {
      if (mu && (vu = null), Pu = 0, mu = !1, 25 <= e) throw Error(f(301));
      if (e += 1, Tl = nl = null, l.updateQueue != null) {
        var n = l.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      E.H = Yo, n = t(a, u);
    } while (mu);
    return n;
  }
  function om() {
    var l = E.H, t = l.useState()[0];
    return t = typeof t.then == "function" ? le(t) : t, l = l.useState()[0], (nl !== null ? nl.memoizedState : null) !== l && (Z.flags |= 1024), t;
  }
  function tc() {
    var l = en !== 0;
    return en = 0, l;
  }
  function ac(l, t, a) {
    t.updateQueue = l.updateQueue, t.flags &= -2053, l.lanes &= ~a;
  }
  function uc(l) {
    if (un) {
      for (l = l.memoizedState; l !== null; ) {
        var t = l.queue;
        t !== null && (t.pending = null), l = l.next;
      }
      un = !1;
    }
    Yt = 0, Tl = nl = Z = null, mu = !1, Pu = en = 0, vu = null;
  }
  function Gl() {
    var l = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return Tl === null ? Z.memoizedState = Tl = l : Tl = Tl.next = l, Tl;
  }
  function bl() {
    if (nl === null) {
      var l = Z.alternate;
      l = l !== null ? l.memoizedState : null;
    } else l = nl.next;
    var t = Tl === null ? Z.memoizedState : Tl.next;
    if (t !== null)
      Tl = t, nl = l;
    else {
      if (l === null)
        throw Z.alternate === null ? Error(f(467)) : Error(f(310));
      nl = l, l = {
        memoizedState: nl.memoizedState,
        baseState: nl.baseState,
        baseQueue: nl.baseQueue,
        queue: nl.queue,
        next: null
      }, Tl === null ? Z.memoizedState = Tl = l : Tl = Tl.next = l;
    }
    return Tl;
  }
  function nn() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function le(l) {
    var t = Pu;
    return Pu += 1, vu === null && (vu = []), l = Vs(vu, l, t), t = Z, (Tl === null ? t.memoizedState : Tl.next) === null && (t = t.alternate, E.H = t === null || t.memoizedState === null ? Bo : hc), l;
  }
  function cn(l) {
    if (l !== null && typeof l == "object") {
      if (typeof l.then == "function") return le(l);
      if (l.$$typeof === Bl) return Rl(l);
    }
    throw Error(f(438, String(l)));
  }
  function ec(l) {
    var t = null, a = Z.updateQueue;
    if (a !== null && (t = a.memoCache), t == null) {
      var u = Z.alternate;
      u !== null && (u = u.updateQueue, u !== null && (u = u.memoCache, u != null && (t = {
        data: u.data.map(function(e) {
          return e.slice();
        }),
        index: 0
      })));
    }
    if (t == null && (t = { data: [], index: 0 }), a === null && (a = nn(), Z.updateQueue = a), a.memoCache = t, a = t.data[t.index], a === void 0)
      for (a = t.data[t.index] = Array(l), u = 0; u < l; u++)
        a[u] = La;
    return t.index++, a;
  }
  function jt(l, t) {
    return typeof t == "function" ? t(l) : t;
  }
  function fn(l) {
    var t = bl();
    return nc(t, nl, l);
  }
  function nc(l, t, a) {
    var u = l.queue;
    if (u === null) throw Error(f(311));
    u.lastRenderedReducer = a;
    var e = l.baseQueue, n = u.pending;
    if (n !== null) {
      if (e !== null) {
        var i = e.next;
        e.next = n.next, n.next = i;
      }
      t.baseQueue = e = n, u.pending = null;
    }
    if (n = l.baseState, e === null) l.memoizedState = n;
    else {
      t = e.next;
      var c = i = null, s = null, r = t, z = !1;
      do {
        var A = r.lane & -536870913;
        if (A !== r.lane ? ($ & A) === A : (Yt & A) === A) {
          var g = r.revertLane;
          if (g === 0)
            s !== null && (s = s.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: r.action,
              hasEagerState: r.hasEagerState,
              eagerState: r.eagerState,
              next: null
            }), A === fu && (z = !0);
          else if ((Yt & g) === g) {
            r = r.next, g === fu && (z = !0);
            continue;
          } else
            A = {
              lane: 0,
              revertLane: r.revertLane,
              gesture: null,
              action: r.action,
              hasEagerState: r.hasEagerState,
              eagerState: r.eagerState,
              next: null
            }, s === null ? (c = s = A, i = n) : s = s.next = A, Z.lanes |= g, oa |= g;
          A = r.action, ja && a(n, A), n = r.hasEagerState ? r.eagerState : a(n, A);
        } else
          g = {
            lane: A,
            revertLane: r.revertLane,
            gesture: r.gesture,
            action: r.action,
            hasEagerState: r.hasEagerState,
            eagerState: r.eagerState,
            next: null
          }, s === null ? (c = s = g, i = n) : s = s.next = g, Z.lanes |= A, oa |= A;
        r = r.next;
      } while (r !== null && r !== t);
      if (s === null ? i = n : s.next = c, !lt(n, l.memoizedState) && (pl = !0, z && (a = su, a !== null)))
        throw a;
      l.memoizedState = n, l.baseState = i, l.baseQueue = s, u.lastRenderedState = n;
    }
    return e === null && (u.lanes = 0), [l.memoizedState, u.dispatch];
  }
  function ic(l) {
    var t = bl(), a = t.queue;
    if (a === null) throw Error(f(311));
    a.lastRenderedReducer = l;
    var u = a.dispatch, e = a.pending, n = t.memoizedState;
    if (e !== null) {
      a.pending = null;
      var i = e = e.next;
      do
        n = l(n, i.action), i = i.next;
      while (i !== e);
      lt(n, t.memoizedState) || (pl = !0), t.memoizedState = n, t.baseQueue === null && (t.baseState = n), a.lastRenderedState = n;
    }
    return [n, u];
  }
  function to(l, t, a) {
    var u = Z, e = bl(), n = F;
    if (n) {
      if (a === void 0) throw Error(f(407));
      a = a();
    } else a = t();
    var i = !lt(
      (nl || e).memoizedState,
      a
    );
    if (i && (e.memoizedState = a, pl = !0), e = e.queue, sc(eo.bind(null, u, e, l), [
      l
    ]), e.getSnapshot !== t || i || Tl !== null && Tl.memoizedState.tag & 1) {
      if (u.flags |= 2048, hu(
        9,
        { destroy: void 0 },
        uo.bind(
          null,
          u,
          e,
          a,
          t
        ),
        null
      ), ol === null) throw Error(f(349));
      n || (Yt & 127) !== 0 || ao(u, t, a);
    }
    return a;
  }
  function ao(l, t, a) {
    l.flags |= 16384, l = { getSnapshot: t, value: a }, t = Z.updateQueue, t === null ? (t = nn(), Z.updateQueue = t, t.stores = [l]) : (a = t.stores, a === null ? t.stores = [l] : a.push(l));
  }
  function uo(l, t, a, u) {
    t.value = a, t.getSnapshot = u, no(t) && io(l);
  }
  function eo(l, t, a) {
    return a(function() {
      no(t) && io(l);
    });
  }
  function no(l) {
    var t = l.getSnapshot;
    l = l.value;
    try {
      var a = t();
      return !lt(l, a);
    } catch {
      return !0;
    }
  }
  function io(l) {
    var t = Ua(l, 2);
    t !== null && kl(t, l, 2);
  }
  function cc(l) {
    var t = Gl();
    if (typeof l == "function") {
      var a = l;
      if (l = a(), ja) {
        kt(!0);
        try {
          a();
        } finally {
          kt(!1);
        }
      }
    }
    return t.memoizedState = t.baseState = l, t.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: jt,
      lastRenderedState: l
    }, t;
  }
  function co(l, t, a, u) {
    return l.baseState = a, nc(
      l,
      nl,
      typeof u == "function" ? u : jt
    );
  }
  function dm(l, t, a, u, e) {
    if (dn(l)) throw Error(f(485));
    if (l = t.action, l !== null) {
      var n = {
        payload: e,
        action: l,
        next: null,
        isTransition: !0,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function(i) {
          n.listeners.push(i);
        }
      };
      E.T !== null ? a(!0) : n.isTransition = !1, u(n), a = t.pending, a === null ? (n.next = t.pending = n, fo(t, n)) : (n.next = a.next, t.pending = a.next = n);
    }
  }
  function fo(l, t) {
    var a = t.action, u = t.payload, e = l.state;
    if (t.isTransition) {
      var n = E.T, i = {};
      E.T = i;
      try {
        var c = a(e, u), s = E.S;
        s !== null && s(i, c), so(l, t, c);
      } catch (r) {
        fc(l, t, r);
      } finally {
        n !== null && i.types !== null && (n.types = i.types), E.T = n;
      }
    } else
      try {
        n = a(e, u), so(l, t, n);
      } catch (r) {
        fc(l, t, r);
      }
  }
  function so(l, t, a) {
    a !== null && typeof a == "object" && typeof a.then == "function" ? a.then(
      function(u) {
        oo(l, t, u);
      },
      function(u) {
        return fc(l, t, u);
      }
    ) : oo(l, t, a);
  }
  function oo(l, t, a) {
    t.status = "fulfilled", t.value = a, yo(t), l.state = a, t = l.pending, t !== null && (a = t.next, a === t ? l.pending = null : (a = a.next, t.next = a, fo(l, a)));
  }
  function fc(l, t, a) {
    var u = l.pending;
    if (l.pending = null, u !== null) {
      u = u.next;
      do
        t.status = "rejected", t.reason = a, yo(t), t = t.next;
      while (t !== u);
    }
    l.action = null;
  }
  function yo(l) {
    l = l.listeners;
    for (var t = 0; t < l.length; t++) (0, l[t])();
  }
  function mo(l, t) {
    return t;
  }
  function vo(l, t) {
    if (F) {
      var a = ol.formState;
      if (a !== null) {
        l: {
          var u = Z;
          if (F) {
            if (dl) {
              t: {
                for (var e = dl, n = vt; e.nodeType !== 8; ) {
                  if (!n) {
                    e = null;
                    break t;
                  }
                  if (e = rt(
                    e.nextSibling
                  ), e === null) {
                    e = null;
                    break t;
                  }
                }
                n = e.data, e = n === "F!" || n === "F" ? e : null;
              }
              if (e) {
                dl = rt(
                  e.nextSibling
                ), u = e.data === "F!";
                break l;
              }
            }
            ta(u);
          }
          u = !1;
        }
        u && (t = a[0]);
      }
    }
    return a = Gl(), a.memoizedState = a.baseState = t, u = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: mo,
      lastRenderedState: t
    }, a.queue = u, a = Ro.bind(
      null,
      Z,
      u
    ), u.dispatch = a, u = cc(!1), n = vc.bind(
      null,
      Z,
      !1,
      u.queue
    ), u = Gl(), e = {
      state: t,
      dispatch: null,
      action: l,
      pending: null
    }, u.queue = e, a = dm.bind(
      null,
      Z,
      e,
      n,
      a
    ), e.dispatch = a, u.memoizedState = l, [t, a, !1];
  }
  function ho(l) {
    var t = bl();
    return ro(t, nl, l);
  }
  function ro(l, t, a) {
    if (t = nc(
      l,
      t,
      mo
    )[0], l = fn(jt)[0], typeof t == "object" && t !== null && typeof t.then == "function")
      try {
        var u = le(t);
      } catch (i) {
        throw i === ou ? Fe : i;
      }
    else u = t;
    t = bl();
    var e = t.queue, n = e.dispatch;
    return a !== t.memoizedState && (Z.flags |= 2048, hu(
      9,
      { destroy: void 0 },
      ym.bind(null, e, a),
      null
    )), [u, n, l];
  }
  function ym(l, t) {
    l.action = t;
  }
  function go(l) {
    var t = bl(), a = nl;
    if (a !== null)
      return ro(t, a, l);
    bl(), t = t.memoizedState, a = bl();
    var u = a.queue.dispatch;
    return a.memoizedState = l, [t, u, !1];
  }
  function hu(l, t, a, u) {
    return l = { tag: l, create: a, deps: u, inst: t, next: null }, t = Z.updateQueue, t === null && (t = nn(), Z.updateQueue = t), a = t.lastEffect, a === null ? t.lastEffect = l.next = l : (u = a.next, a.next = l, l.next = u, t.lastEffect = l), l;
  }
  function So() {
    return bl().memoizedState;
  }
  function sn(l, t, a, u) {
    var e = Gl();
    Z.flags |= l, e.memoizedState = hu(
      1 | t,
      { destroy: void 0 },
      a,
      u === void 0 ? null : u
    );
  }
  function on(l, t, a, u) {
    var e = bl();
    u = u === void 0 ? null : u;
    var n = e.memoizedState.inst;
    nl !== null && u !== null && Pi(u, nl.memoizedState.deps) ? e.memoizedState = hu(t, n, a, u) : (Z.flags |= l, e.memoizedState = hu(
      1 | t,
      n,
      a,
      u
    ));
  }
  function bo(l, t) {
    sn(8390656, 8, l, t);
  }
  function sc(l, t) {
    on(2048, 8, l, t);
  }
  function mm(l) {
    Z.flags |= 4;
    var t = Z.updateQueue;
    if (t === null)
      t = nn(), Z.updateQueue = t, t.events = [l];
    else {
      var a = t.events;
      a === null ? t.events = [l] : a.push(l);
    }
  }
  function zo(l) {
    var t = bl().memoizedState;
    return mm({ ref: t, nextImpl: l }), function() {
      if ((ll & 2) !== 0) throw Error(f(440));
      return t.impl.apply(void 0, arguments);
    };
  }
  function Eo(l, t) {
    return on(4, 2, l, t);
  }
  function To(l, t) {
    return on(4, 4, l, t);
  }
  function po(l, t) {
    if (typeof t == "function") {
      l = l();
      var a = t(l);
      return function() {
        typeof a == "function" ? a() : t(null);
      };
    }
    if (t != null)
      return l = l(), t.current = l, function() {
        t.current = null;
      };
  }
  function Ao(l, t, a) {
    a = a != null ? a.concat([l]) : null, on(4, 4, po.bind(null, t, l), a);
  }
  function oc() {
  }
  function _o(l, t) {
    var a = bl();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    return t !== null && Pi(t, u[1]) ? u[0] : (a.memoizedState = [l, t], l);
  }
  function Oo(l, t) {
    var a = bl();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    if (t !== null && Pi(t, u[1]))
      return u[0];
    if (u = l(), ja) {
      kt(!0);
      try {
        l();
      } finally {
        kt(!1);
      }
    }
    return a.memoizedState = [u, t], u;
  }
  function dc(l, t, a) {
    return a === void 0 || (Yt & 1073741824) !== 0 && ($ & 261930) === 0 ? l.memoizedState = t : (l.memoizedState = a, l = M0(), Z.lanes |= l, oa |= l, a);
  }
  function Mo(l, t, a, u) {
    return lt(a, t) ? a : yu.current !== null ? (l = dc(l, a, u), lt(l, t) || (pl = !0), l) : (Yt & 42) === 0 || (Yt & 1073741824) !== 0 && ($ & 261930) === 0 ? (pl = !0, l.memoizedState = a) : (l = M0(), Z.lanes |= l, oa |= l, t);
  }
  function Do(l, t, a, u, e) {
    var n = M.p;
    M.p = n !== 0 && 8 > n ? n : 8;
    var i = E.T, c = {};
    E.T = c, vc(l, !1, t, a);
    try {
      var s = e(), r = E.S;
      if (r !== null && r(c, s), s !== null && typeof s == "object" && typeof s.then == "function") {
        var z = fm(
          s,
          u
        );
        te(
          l,
          t,
          z,
          it(l)
        );
      } else
        te(
          l,
          t,
          u,
          it(l)
        );
    } catch (A) {
      te(
        l,
        t,
        { then: function() {
        }, status: "rejected", reason: A },
        it()
      );
    } finally {
      M.p = n, i !== null && c.types !== null && (i.types = c.types), E.T = i;
    }
  }
  function vm() {
  }
  function yc(l, t, a, u) {
    if (l.tag !== 5) throw Error(f(476));
    var e = Uo(l).queue;
    Do(
      l,
      e,
      t,
      Y,
      a === null ? vm : function() {
        return No(l), a(u);
      }
    );
  }
  function Uo(l) {
    var t = l.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: Y,
      baseState: Y,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: jt,
        lastRenderedState: Y
      },
      next: null
    };
    var a = {};
    return t.next = {
      memoizedState: a,
      baseState: a,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: jt,
        lastRenderedState: a
      },
      next: null
    }, l.memoizedState = t, l = l.alternate, l !== null && (l.memoizedState = t), t;
  }
  function No(l) {
    var t = Uo(l);
    t.next === null && (t = l.alternate.memoizedState), te(
      l,
      t.next.queue,
      {},
      it()
    );
  }
  function mc() {
    return Rl(Se);
  }
  function Ho() {
    return bl().memoizedState;
  }
  function Co() {
    return bl().memoizedState;
  }
  function hm(l) {
    for (var t = l.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = it();
          l = ea(a);
          var u = na(t, l, a);
          u !== null && (kl(u, t, a), ku(u, t, a)), t = { cache: Zi() }, l.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function rm(l, t, a) {
    var u = it();
    a = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, dn(l) ? xo(t, a) : (a = Hi(l, t, a, u), a !== null && (kl(a, l, u), qo(a, t, u)));
  }
  function Ro(l, t, a) {
    var u = it();
    te(l, t, a, u);
  }
  function te(l, t, a, u) {
    var e = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (dn(l)) xo(t, e);
    else {
      var n = l.alternate;
      if (l.lanes === 0 && (n === null || n.lanes === 0) && (n = t.lastRenderedReducer, n !== null))
        try {
          var i = t.lastRenderedState, c = n(i, a);
          if (e.hasEagerState = !0, e.eagerState = c, lt(c, i))
            return Ve(l, t, e, 0), ol === null && Le(), !1;
        } catch {
        } finally {
        }
      if (a = Hi(l, t, e, u), a !== null)
        return kl(a, l, u), qo(a, t, u), !0;
    }
    return !1;
  }
  function vc(l, t, a, u) {
    if (u = {
      lane: 2,
      revertLane: Jc(),
      gesture: null,
      action: u,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, dn(l)) {
      if (t) throw Error(f(479));
    } else
      t = Hi(
        l,
        a,
        u,
        2
      ), t !== null && kl(t, l, 2);
  }
  function dn(l) {
    var t = l.alternate;
    return l === Z || t !== null && t === Z;
  }
  function xo(l, t) {
    mu = un = !0;
    var a = l.pending;
    a === null ? t.next = t : (t.next = a.next, a.next = t), l.pending = t;
  }
  function qo(l, t, a) {
    if ((a & 4194048) !== 0) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Gf(l, a);
    }
  }
  var ae = {
    readContext: Rl,
    use: cn,
    useCallback: hl,
    useContext: hl,
    useEffect: hl,
    useImperativeHandle: hl,
    useLayoutEffect: hl,
    useInsertionEffect: hl,
    useMemo: hl,
    useReducer: hl,
    useRef: hl,
    useState: hl,
    useDebugValue: hl,
    useDeferredValue: hl,
    useTransition: hl,
    useSyncExternalStore: hl,
    useId: hl,
    useHostTransitionStatus: hl,
    useFormState: hl,
    useActionState: hl,
    useOptimistic: hl,
    useMemoCache: hl,
    useCacheRefresh: hl
  };
  ae.useEffectEvent = hl;
  var Bo = {
    readContext: Rl,
    use: cn,
    useCallback: function(l, t) {
      return Gl().memoizedState = [
        l,
        t === void 0 ? null : t
      ], l;
    },
    useContext: Rl,
    useEffect: bo,
    useImperativeHandle: function(l, t, a) {
      a = a != null ? a.concat([l]) : null, sn(
        4194308,
        4,
        po.bind(null, t, l),
        a
      );
    },
    useLayoutEffect: function(l, t) {
      return sn(4194308, 4, l, t);
    },
    useInsertionEffect: function(l, t) {
      sn(4, 2, l, t);
    },
    useMemo: function(l, t) {
      var a = Gl();
      t = t === void 0 ? null : t;
      var u = l();
      if (ja) {
        kt(!0);
        try {
          l();
        } finally {
          kt(!1);
        }
      }
      return a.memoizedState = [u, t], u;
    },
    useReducer: function(l, t, a) {
      var u = Gl();
      if (a !== void 0) {
        var e = a(t);
        if (ja) {
          kt(!0);
          try {
            a(t);
          } finally {
            kt(!1);
          }
        }
      } else e = t;
      return u.memoizedState = u.baseState = e, l = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: l,
        lastRenderedState: e
      }, u.queue = l, l = l.dispatch = rm.bind(
        null,
        Z,
        l
      ), [u.memoizedState, l];
    },
    useRef: function(l) {
      var t = Gl();
      return l = { current: l }, t.memoizedState = l;
    },
    useState: function(l) {
      l = cc(l);
      var t = l.queue, a = Ro.bind(null, Z, t);
      return t.dispatch = a, [l.memoizedState, a];
    },
    useDebugValue: oc,
    useDeferredValue: function(l, t) {
      var a = Gl();
      return dc(a, l, t);
    },
    useTransition: function() {
      var l = cc(!1);
      return l = Do.bind(
        null,
        Z,
        l.queue,
        !0,
        !1
      ), Gl().memoizedState = l, [!1, l];
    },
    useSyncExternalStore: function(l, t, a) {
      var u = Z, e = Gl();
      if (F) {
        if (a === void 0)
          throw Error(f(407));
        a = a();
      } else {
        if (a = t(), ol === null)
          throw Error(f(349));
        ($ & 127) !== 0 || ao(u, t, a);
      }
      e.memoizedState = a;
      var n = { value: a, getSnapshot: t };
      return e.queue = n, bo(eo.bind(null, u, n, l), [
        l
      ]), u.flags |= 2048, hu(
        9,
        { destroy: void 0 },
        uo.bind(
          null,
          u,
          n,
          a,
          t
        ),
        null
      ), a;
    },
    useId: function() {
      var l = Gl(), t = ol.identifierPrefix;
      if (F) {
        var a = Ot, u = _t;
        a = (u & ~(1 << 32 - Pl(u) - 1)).toString(32) + a, t = "_" + t + "R_" + a, a = en++, 0 < a && (t += "H" + a.toString(32)), t += "_";
      } else
        a = sm++, t = "_" + t + "r_" + a.toString(32) + "_";
      return l.memoizedState = t;
    },
    useHostTransitionStatus: mc,
    useFormState: vo,
    useActionState: vo,
    useOptimistic: function(l) {
      var t = Gl();
      t.memoizedState = t.baseState = l;
      var a = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return t.queue = a, t = vc.bind(
        null,
        Z,
        !0,
        a
      ), a.dispatch = t, [l, t];
    },
    useMemoCache: ec,
    useCacheRefresh: function() {
      return Gl().memoizedState = hm.bind(
        null,
        Z
      );
    },
    useEffectEvent: function(l) {
      var t = Gl(), a = { impl: l };
      return t.memoizedState = a, function() {
        if ((ll & 2) !== 0)
          throw Error(f(440));
        return a.impl.apply(void 0, arguments);
      };
    }
  }, hc = {
    readContext: Rl,
    use: cn,
    useCallback: _o,
    useContext: Rl,
    useEffect: sc,
    useImperativeHandle: Ao,
    useInsertionEffect: Eo,
    useLayoutEffect: To,
    useMemo: Oo,
    useReducer: fn,
    useRef: So,
    useState: function() {
      return fn(jt);
    },
    useDebugValue: oc,
    useDeferredValue: function(l, t) {
      var a = bl();
      return Mo(
        a,
        nl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = fn(jt)[0], t = bl().memoizedState;
      return [
        typeof l == "boolean" ? l : le(l),
        t
      ];
    },
    useSyncExternalStore: to,
    useId: Ho,
    useHostTransitionStatus: mc,
    useFormState: ho,
    useActionState: ho,
    useOptimistic: function(l, t) {
      var a = bl();
      return co(a, nl, l, t);
    },
    useMemoCache: ec,
    useCacheRefresh: Co
  };
  hc.useEffectEvent = zo;
  var Yo = {
    readContext: Rl,
    use: cn,
    useCallback: _o,
    useContext: Rl,
    useEffect: sc,
    useImperativeHandle: Ao,
    useInsertionEffect: Eo,
    useLayoutEffect: To,
    useMemo: Oo,
    useReducer: ic,
    useRef: So,
    useState: function() {
      return ic(jt);
    },
    useDebugValue: oc,
    useDeferredValue: function(l, t) {
      var a = bl();
      return nl === null ? dc(a, l, t) : Mo(
        a,
        nl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = ic(jt)[0], t = bl().memoizedState;
      return [
        typeof l == "boolean" ? l : le(l),
        t
      ];
    },
    useSyncExternalStore: to,
    useId: Ho,
    useHostTransitionStatus: mc,
    useFormState: go,
    useActionState: go,
    useOptimistic: function(l, t) {
      var a = bl();
      return nl !== null ? co(a, nl, l, t) : (a.baseState = l, [l, a.queue.dispatch]);
    },
    useMemoCache: ec,
    useCacheRefresh: Co
  };
  Yo.useEffectEvent = zo;
  function rc(l, t, a, u) {
    t = l.memoizedState, a = a(u, t), a = a == null ? t : q({}, t, a), l.memoizedState = a, l.lanes === 0 && (l.updateQueue.baseState = a);
  }
  var gc = {
    enqueueSetState: function(l, t, a) {
      l = l._reactInternals;
      var u = it(), e = ea(u);
      e.payload = t, a != null && (e.callback = a), t = na(l, e, u), t !== null && (kl(t, l, u), ku(t, l, u));
    },
    enqueueReplaceState: function(l, t, a) {
      l = l._reactInternals;
      var u = it(), e = ea(u);
      e.tag = 1, e.payload = t, a != null && (e.callback = a), t = na(l, e, u), t !== null && (kl(t, l, u), ku(t, l, u));
    },
    enqueueForceUpdate: function(l, t) {
      l = l._reactInternals;
      var a = it(), u = ea(a);
      u.tag = 2, t != null && (u.callback = t), t = na(l, u, a), t !== null && (kl(t, l, a), ku(t, l, a));
    }
  };
  function jo(l, t, a, u, e, n, i) {
    return l = l.stateNode, typeof l.shouldComponentUpdate == "function" ? l.shouldComponentUpdate(u, n, i) : t.prototype && t.prototype.isPureReactComponent ? !Zu(a, u) || !Zu(e, n) : !0;
  }
  function Go(l, t, a, u) {
    l = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(a, u), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(a, u), t.state !== l && gc.enqueueReplaceState(t, t.state, null);
  }
  function Ga(l, t) {
    var a = t;
    if ("ref" in t) {
      a = {};
      for (var u in t)
        u !== "ref" && (a[u] = t[u]);
    }
    if (l = l.defaultProps) {
      a === t && (a = q({}, a));
      for (var e in l)
        a[e] === void 0 && (a[e] = l[e]);
    }
    return a;
  }
  function Xo(l) {
    Ze(l);
  }
  function Qo(l) {
    console.error(l);
  }
  function Zo(l) {
    Ze(l);
  }
  function yn(l, t) {
    try {
      var a = l.onUncaughtError;
      a(t.value, { componentStack: t.stack });
    } catch (u) {
      setTimeout(function() {
        throw u;
      });
    }
  }
  function Lo(l, t, a) {
    try {
      var u = l.onCaughtError;
      u(a.value, {
        componentStack: a.stack,
        errorBoundary: t.tag === 1 ? t.stateNode : null
      });
    } catch (e) {
      setTimeout(function() {
        throw e;
      });
    }
  }
  function Sc(l, t, a) {
    return a = ea(a), a.tag = 3, a.payload = { element: null }, a.callback = function() {
      yn(l, t);
    }, a;
  }
  function Vo(l) {
    return l = ea(l), l.tag = 3, l;
  }
  function Ko(l, t, a, u) {
    var e = a.type.getDerivedStateFromError;
    if (typeof e == "function") {
      var n = u.value;
      l.payload = function() {
        return e(n);
      }, l.callback = function() {
        Lo(t, a, u);
      };
    }
    var i = a.stateNode;
    i !== null && typeof i.componentDidCatch == "function" && (l.callback = function() {
      Lo(t, a, u), typeof e != "function" && (da === null ? da = /* @__PURE__ */ new Set([this]) : da.add(this));
      var c = u.stack;
      this.componentDidCatch(u.value, {
        componentStack: c !== null ? c : ""
      });
    });
  }
  function gm(l, t, a, u, e) {
    if (a.flags |= 32768, u !== null && typeof u == "object" && typeof u.then == "function") {
      if (t = a.alternate, t !== null && cu(
        t,
        a,
        e,
        !0
      ), a = at.current, a !== null) {
        switch (a.tag) {
          case 31:
          case 13:
            return ht === null ? An() : a.alternate === null && rl === 0 && (rl = 3), a.flags &= -257, a.flags |= 65536, a.lanes = e, u === Ie ? a.flags |= 16384 : (t = a.updateQueue, t === null ? a.updateQueue = /* @__PURE__ */ new Set([u]) : t.add(u), Lc(l, u, e)), !1;
          case 22:
            return a.flags |= 65536, u === Ie ? a.flags |= 16384 : (t = a.updateQueue, t === null ? (t = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([u])
            }, a.updateQueue = t) : (a = t.retryQueue, a === null ? t.retryQueue = /* @__PURE__ */ new Set([u]) : a.add(u)), Lc(l, u, e)), !1;
        }
        throw Error(f(435, a.tag));
      }
      return Lc(l, u, e), An(), !1;
    }
    if (F)
      return t = at.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = e, u !== Yi && (l = Error(f(422), { cause: u }), Ku(dt(l, a)))) : (u !== Yi && (t = Error(f(423), {
        cause: u
      }), Ku(
        dt(t, a)
      )), l = l.current.alternate, l.flags |= 65536, e &= -e, l.lanes |= e, u = dt(u, a), e = Sc(
        l.stateNode,
        u,
        e
      ), $i(l, e), rl !== 4 && (rl = 2)), !1;
    var n = Error(f(520), { cause: u });
    if (n = dt(n, a), oe === null ? oe = [n] : oe.push(n), rl !== 4 && (rl = 2), t === null) return !0;
    u = dt(u, a), a = t;
    do {
      switch (a.tag) {
        case 3:
          return a.flags |= 65536, l = e & -e, a.lanes |= l, l = Sc(a.stateNode, u, l), $i(a, l), !1;
        case 1:
          if (t = a.type, n = a.stateNode, (a.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || n !== null && typeof n.componentDidCatch == "function" && (da === null || !da.has(n))))
            return a.flags |= 65536, e &= -e, a.lanes |= e, e = Vo(e), Ko(
              e,
              l,
              a,
              u
            ), $i(a, e), !1;
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var bc = Error(f(461)), pl = !1;
  function xl(l, t, a, u) {
    t.child = l === null ? $s(t, null, a, u) : Ya(
      t,
      l.child,
      a,
      u
    );
  }
  function Jo(l, t, a, u, e) {
    a = a.render;
    var n = t.ref;
    if ("ref" in u) {
      var i = {};
      for (var c in u)
        c !== "ref" && (i[c] = u[c]);
    } else i = u;
    return Ra(t), u = lc(
      l,
      t,
      a,
      i,
      n,
      e
    ), c = tc(), l !== null && !pl ? (ac(l, t, e), Gt(l, t, e)) : (F && c && qi(t), t.flags |= 1, xl(l, t, u, e), t.child);
  }
  function wo(l, t, a, u, e) {
    if (l === null) {
      var n = a.type;
      return typeof n == "function" && !Ci(n) && n.defaultProps === void 0 && a.compare === null ? (t.tag = 15, t.type = n, $o(
        l,
        t,
        n,
        u,
        e
      )) : (l = Je(
        a.type,
        null,
        u,
        t,
        t.mode,
        e
      ), l.ref = t.ref, l.return = t, t.child = l);
    }
    if (n = l.child, !Mc(l, e)) {
      var i = n.memoizedProps;
      if (a = a.compare, a = a !== null ? a : Zu, a(i, u) && l.ref === t.ref)
        return Gt(l, t, e);
    }
    return t.flags |= 1, l = Rt(n, u), l.ref = t.ref, l.return = t, t.child = l;
  }
  function $o(l, t, a, u, e) {
    if (l !== null) {
      var n = l.memoizedProps;
      if (Zu(n, u) && l.ref === t.ref)
        if (pl = !1, t.pendingProps = u = n, Mc(l, e))
          (l.flags & 131072) !== 0 && (pl = !0);
        else
          return t.lanes = l.lanes, Gt(l, t, e);
    }
    return zc(
      l,
      t,
      a,
      u,
      e
    );
  }
  function Wo(l, t, a, u) {
    var e = u.children, n = l !== null ? l.memoizedState : null;
    if (l === null && t.stateNode === null && (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), u.mode === "hidden") {
      if ((t.flags & 128) !== 0) {
        if (n = n !== null ? n.baseLanes | a : a, l !== null) {
          for (u = t.child = l.child, e = 0; u !== null; )
            e = e | u.lanes | u.childLanes, u = u.sibling;
          u = e & ~n;
        } else u = 0, t.child = null;
        return ko(
          l,
          t,
          n,
          a,
          u
        );
      }
      if ((a & 536870912) !== 0)
        t.memoizedState = { baseLanes: 0, cachePool: null }, l !== null && ke(
          t,
          n !== null ? n.cachePool : null
        ), n !== null ? Fs(t, n) : ki(), Is(t);
      else
        return u = t.lanes = 536870912, ko(
          l,
          t,
          n !== null ? n.baseLanes | a : a,
          a,
          u
        );
    } else
      n !== null ? (ke(t, n.cachePool), Fs(t, n), ca(), t.memoizedState = null) : (l !== null && ke(t, null), ki(), ca());
    return xl(l, t, e, a), t.child;
  }
  function ue(l, t) {
    return l !== null && l.tag === 22 || t.stateNode !== null || (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), t.sibling;
  }
  function ko(l, t, a, u, e) {
    var n = Vi();
    return n = n === null ? null : { parent: El._currentValue, pool: n }, t.memoizedState = {
      baseLanes: a,
      cachePool: n
    }, l !== null && ke(t, null), ki(), Is(t), l !== null && cu(l, t, u, !0), t.childLanes = e, null;
  }
  function mn(l, t) {
    return t = hn(
      { mode: t.mode, children: t.children },
      l.mode
    ), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function Fo(l, t, a) {
    return Ya(t, l.child, null, a), l = mn(t, t.pendingProps), l.flags |= 2, ut(t), t.memoizedState = null, l;
  }
  function Sm(l, t, a) {
    var u = t.pendingProps, e = (t.flags & 128) !== 0;
    if (t.flags &= -129, l === null) {
      if (F) {
        if (u.mode === "hidden")
          return l = mn(t, u), t.lanes = 536870912, ue(null, l);
        if (Ii(t), (l = dl) ? (l = sd(
          l,
          vt
        ), l = l !== null && l.data === "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: Pt !== null ? { id: _t, overflow: Ot } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = Rs(l), a.return = t, t.child = a, Cl = t, dl = null)) : l = null, l === null) throw ta(t);
        return t.lanes = 536870912, null;
      }
      return mn(t, u);
    }
    var n = l.memoizedState;
    if (n !== null) {
      var i = n.dehydrated;
      if (Ii(t), e)
        if (t.flags & 256)
          t.flags &= -257, t = Fo(
            l,
            t,
            a
          );
        else if (t.memoizedState !== null)
          t.child = l.child, t.flags |= 128, t = null;
        else throw Error(f(558));
      else if (pl || cu(l, t, a, !1), e = (a & l.childLanes) !== 0, pl || e) {
        if (u = ol, u !== null && (i = Xf(u, a), i !== 0 && i !== n.retryLane))
          throw n.retryLane = i, Ua(l, i), kl(u, l, i), bc;
        An(), t = Fo(
          l,
          t,
          a
        );
      } else
        l = n.treeContext, dl = rt(i.nextSibling), Cl = t, F = !0, la = null, vt = !1, l !== null && Bs(t, l), t = mn(t, u), t.flags |= 4096;
      return t;
    }
    return l = Rt(l.child, {
      mode: u.mode,
      children: u.children
    }), l.ref = t.ref, t.child = l, l.return = t, l;
  }
  function vn(l, t) {
    var a = t.ref;
    if (a === null)
      l !== null && l.ref !== null && (t.flags |= 4194816);
    else {
      if (typeof a != "function" && typeof a != "object")
        throw Error(f(284));
      (l === null || l.ref !== a) && (t.flags |= 4194816);
    }
  }
  function zc(l, t, a, u, e) {
    return Ra(t), a = lc(
      l,
      t,
      a,
      u,
      void 0,
      e
    ), u = tc(), l !== null && !pl ? (ac(l, t, e), Gt(l, t, e)) : (F && u && qi(t), t.flags |= 1, xl(l, t, a, e), t.child);
  }
  function Io(l, t, a, u, e, n) {
    return Ra(t), t.updateQueue = null, a = lo(
      t,
      u,
      a,
      e
    ), Ps(l), u = tc(), l !== null && !pl ? (ac(l, t, n), Gt(l, t, n)) : (F && u && qi(t), t.flags |= 1, xl(l, t, a, n), t.child);
  }
  function Po(l, t, a, u, e) {
    if (Ra(t), t.stateNode === null) {
      var n = uu, i = a.contextType;
      typeof i == "object" && i !== null && (n = Rl(i)), n = new a(u, n), t.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = gc, t.stateNode = n, n._reactInternals = t, n = t.stateNode, n.props = u, n.state = t.memoizedState, n.refs = {}, Ji(t), i = a.contextType, n.context = typeof i == "object" && i !== null ? Rl(i) : uu, n.state = t.memoizedState, i = a.getDerivedStateFromProps, typeof i == "function" && (rc(
        t,
        a,
        i,
        u
      ), n.state = t.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (i = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), i !== n.state && gc.enqueueReplaceState(n, n.state, null), Iu(t, u, n, e), Fu(), n.state = t.memoizedState), typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !0;
    } else if (l === null) {
      n = t.stateNode;
      var c = t.memoizedProps, s = Ga(a, c);
      n.props = s;
      var r = n.context, z = a.contextType;
      i = uu, typeof z == "object" && z !== null && (i = Rl(z));
      var A = a.getDerivedStateFromProps;
      z = typeof A == "function" || typeof n.getSnapshotBeforeUpdate == "function", c = t.pendingProps !== c, z || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (c || r !== i) && Go(
        t,
        n,
        u,
        i
      ), ua = !1;
      var g = t.memoizedState;
      n.state = g, Iu(t, u, n, e), Fu(), r = t.memoizedState, c || g !== r || ua ? (typeof A == "function" && (rc(
        t,
        a,
        A,
        u
      ), r = t.memoizedState), (s = ua || jo(
        t,
        a,
        s,
        u,
        g,
        r,
        i
      )) ? (z || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount()), typeof n.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = u, t.memoizedState = r), n.props = u, n.state = r, n.context = i, u = s) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !1);
    } else {
      n = t.stateNode, wi(l, t), i = t.memoizedProps, z = Ga(a, i), n.props = z, A = t.pendingProps, g = n.context, r = a.contextType, s = uu, typeof r == "object" && r !== null && (s = Rl(r)), c = a.getDerivedStateFromProps, (r = typeof c == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (i !== A || g !== s) && Go(
        t,
        n,
        u,
        s
      ), ua = !1, g = t.memoizedState, n.state = g, Iu(t, u, n, e), Fu();
      var b = t.memoizedState;
      i !== A || g !== b || ua || l !== null && l.dependencies !== null && $e(l.dependencies) ? (typeof c == "function" && (rc(
        t,
        a,
        c,
        u
      ), b = t.memoizedState), (z = ua || jo(
        t,
        a,
        z,
        u,
        g,
        b,
        s
      ) || l !== null && l.dependencies !== null && $e(l.dependencies)) ? (r || typeof n.UNSAFE_componentWillUpdate != "function" && typeof n.componentWillUpdate != "function" || (typeof n.componentWillUpdate == "function" && n.componentWillUpdate(u, b, s), typeof n.UNSAFE_componentWillUpdate == "function" && n.UNSAFE_componentWillUpdate(
        u,
        b,
        s
      )), typeof n.componentDidUpdate == "function" && (t.flags |= 4), typeof n.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && g === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && g === l.memoizedState || (t.flags |= 1024), t.memoizedProps = u, t.memoizedState = b), n.props = u, n.state = b, n.context = s, u = z) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && g === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && g === l.memoizedState || (t.flags |= 1024), u = !1);
    }
    return n = u, vn(l, t), u = (t.flags & 128) !== 0, n || u ? (n = t.stateNode, a = u && typeof a.getDerivedStateFromError != "function" ? null : n.render(), t.flags |= 1, l !== null && u ? (t.child = Ya(
      t,
      l.child,
      null,
      e
    ), t.child = Ya(
      t,
      null,
      a,
      e
    )) : xl(l, t, a, e), t.memoizedState = n.state, l = t.child) : l = Gt(
      l,
      t,
      e
    ), l;
  }
  function l0(l, t, a, u) {
    return Ha(), t.flags |= 256, xl(l, t, a, u), t.child;
  }
  var Ec = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function Tc(l) {
    return { baseLanes: l, cachePool: Zs() };
  }
  function pc(l, t, a) {
    return l = l !== null ? l.childLanes & ~a : 0, t && (l |= nt), l;
  }
  function t0(l, t, a) {
    var u = t.pendingProps, e = !1, n = (t.flags & 128) !== 0, i;
    if ((i = n) || (i = l !== null && l.memoizedState === null ? !1 : (Sl.current & 2) !== 0), i && (e = !0, t.flags &= -129), i = (t.flags & 32) !== 0, t.flags &= -33, l === null) {
      if (F) {
        if (e ? ia(t) : ca(), (l = dl) ? (l = sd(
          l,
          vt
        ), l = l !== null && l.data !== "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: Pt !== null ? { id: _t, overflow: Ot } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = Rs(l), a.return = t, t.child = a, Cl = t, dl = null)) : l = null, l === null) throw ta(t);
        return nf(l) ? t.lanes = 32 : t.lanes = 536870912, null;
      }
      var c = u.children;
      return u = u.fallback, e ? (ca(), e = t.mode, c = hn(
        { mode: "hidden", children: c },
        e
      ), u = Na(
        u,
        e,
        a,
        null
      ), c.return = t, u.return = t, c.sibling = u, t.child = c, u = t.child, u.memoizedState = Tc(a), u.childLanes = pc(
        l,
        i,
        a
      ), t.memoizedState = Ec, ue(null, u)) : (ia(t), Ac(t, c));
    }
    var s = l.memoizedState;
    if (s !== null && (c = s.dehydrated, c !== null)) {
      if (n)
        t.flags & 256 ? (ia(t), t.flags &= -257, t = _c(
          l,
          t,
          a
        )) : t.memoizedState !== null ? (ca(), t.child = l.child, t.flags |= 128, t = null) : (ca(), c = u.fallback, e = t.mode, u = hn(
          { mode: "visible", children: u.children },
          e
        ), c = Na(
          c,
          e,
          a,
          null
        ), c.flags |= 2, u.return = t, c.return = t, u.sibling = c, t.child = u, Ya(
          t,
          l.child,
          null,
          a
        ), u = t.child, u.memoizedState = Tc(a), u.childLanes = pc(
          l,
          i,
          a
        ), t.memoizedState = Ec, t = ue(null, u));
      else if (ia(t), nf(c)) {
        if (i = c.nextSibling && c.nextSibling.dataset, i) var r = i.dgst;
        i = r, u = Error(f(419)), u.stack = "", u.digest = i, Ku({ value: u, source: null, stack: null }), t = _c(
          l,
          t,
          a
        );
      } else if (pl || cu(l, t, a, !1), i = (a & l.childLanes) !== 0, pl || i) {
        if (i = ol, i !== null && (u = Xf(i, a), u !== 0 && u !== s.retryLane))
          throw s.retryLane = u, Ua(l, u), kl(i, l, u), bc;
        ef(c) || An(), t = _c(
          l,
          t,
          a
        );
      } else
        ef(c) ? (t.flags |= 192, t.child = l.child, t = null) : (l = s.treeContext, dl = rt(
          c.nextSibling
        ), Cl = t, F = !0, la = null, vt = !1, l !== null && Bs(t, l), t = Ac(
          t,
          u.children
        ), t.flags |= 4096);
      return t;
    }
    return e ? (ca(), c = u.fallback, e = t.mode, s = l.child, r = s.sibling, u = Rt(s, {
      mode: "hidden",
      children: u.children
    }), u.subtreeFlags = s.subtreeFlags & 65011712, r !== null ? c = Rt(
      r,
      c
    ) : (c = Na(
      c,
      e,
      a,
      null
    ), c.flags |= 2), c.return = t, u.return = t, u.sibling = c, t.child = u, ue(null, u), u = t.child, c = l.child.memoizedState, c === null ? c = Tc(a) : (e = c.cachePool, e !== null ? (s = El._currentValue, e = e.parent !== s ? { parent: s, pool: s } : e) : e = Zs(), c = {
      baseLanes: c.baseLanes | a,
      cachePool: e
    }), u.memoizedState = c, u.childLanes = pc(
      l,
      i,
      a
    ), t.memoizedState = Ec, ue(l.child, u)) : (ia(t), a = l.child, l = a.sibling, a = Rt(a, {
      mode: "visible",
      children: u.children
    }), a.return = t, a.sibling = null, l !== null && (i = t.deletions, i === null ? (t.deletions = [l], t.flags |= 16) : i.push(l)), t.child = a, t.memoizedState = null, a);
  }
  function Ac(l, t) {
    return t = hn(
      { mode: "visible", children: t },
      l.mode
    ), t.return = l, l.child = t;
  }
  function hn(l, t) {
    return l = tt(22, l, null, t), l.lanes = 0, l;
  }
  function _c(l, t, a) {
    return Ya(t, l.child, null, a), l = Ac(
      t,
      t.pendingProps.children
    ), l.flags |= 2, t.memoizedState = null, l;
  }
  function a0(l, t, a) {
    l.lanes |= t;
    var u = l.alternate;
    u !== null && (u.lanes |= t), Xi(l.return, t, a);
  }
  function Oc(l, t, a, u, e, n) {
    var i = l.memoizedState;
    i === null ? l.memoizedState = {
      isBackwards: t,
      rendering: null,
      renderingStartTime: 0,
      last: u,
      tail: a,
      tailMode: e,
      treeForkCount: n
    } : (i.isBackwards = t, i.rendering = null, i.renderingStartTime = 0, i.last = u, i.tail = a, i.tailMode = e, i.treeForkCount = n);
  }
  function u0(l, t, a) {
    var u = t.pendingProps, e = u.revealOrder, n = u.tail;
    u = u.children;
    var i = Sl.current, c = (i & 2) !== 0;
    if (c ? (i = i & 1 | 2, t.flags |= 128) : i &= 1, D(Sl, i), xl(l, t, u, a), u = F ? Vu : 0, !c && l !== null && (l.flags & 128) !== 0)
      l: for (l = t.child; l !== null; ) {
        if (l.tag === 13)
          l.memoizedState !== null && a0(l, a, t);
        else if (l.tag === 19)
          a0(l, a, t);
        else if (l.child !== null) {
          l.child.return = l, l = l.child;
          continue;
        }
        if (l === t) break l;
        for (; l.sibling === null; ) {
          if (l.return === null || l.return === t)
            break l;
          l = l.return;
        }
        l.sibling.return = l.return, l = l.sibling;
      }
    switch (e) {
      case "forwards":
        for (a = t.child, e = null; a !== null; )
          l = a.alternate, l !== null && an(l) === null && (e = a), a = a.sibling;
        a = e, a === null ? (e = t.child, t.child = null) : (e = a.sibling, a.sibling = null), Oc(
          t,
          !1,
          e,
          a,
          n,
          u
        );
        break;
      case "backwards":
      case "unstable_legacy-backwards":
        for (a = null, e = t.child, t.child = null; e !== null; ) {
          if (l = e.alternate, l !== null && an(l) === null) {
            t.child = e;
            break;
          }
          l = e.sibling, e.sibling = a, a = e, e = l;
        }
        Oc(
          t,
          !0,
          a,
          null,
          n,
          u
        );
        break;
      case "together":
        Oc(
          t,
          !1,
          null,
          null,
          void 0,
          u
        );
        break;
      default:
        t.memoizedState = null;
    }
    return t.child;
  }
  function Gt(l, t, a) {
    if (l !== null && (t.dependencies = l.dependencies), oa |= t.lanes, (a & t.childLanes) === 0)
      if (l !== null) {
        if (cu(
          l,
          t,
          a,
          !1
        ), (a & t.childLanes) === 0)
          return null;
      } else return null;
    if (l !== null && t.child !== l.child)
      throw Error(f(153));
    if (t.child !== null) {
      for (l = t.child, a = Rt(l, l.pendingProps), t.child = a, a.return = t; l.sibling !== null; )
        l = l.sibling, a = a.sibling = Rt(l, l.pendingProps), a.return = t;
      a.sibling = null;
    }
    return t.child;
  }
  function Mc(l, t) {
    return (l.lanes & t) !== 0 ? !0 : (l = l.dependencies, !!(l !== null && $e(l)));
  }
  function bm(l, t, a) {
    switch (t.tag) {
      case 3:
        jl(t, t.stateNode.containerInfo), aa(t, El, l.memoizedState.cache), Ha();
        break;
      case 27:
      case 5:
        Uu(t);
        break;
      case 4:
        jl(t, t.stateNode.containerInfo);
        break;
      case 10:
        aa(
          t,
          t.type,
          t.memoizedProps.value
        );
        break;
      case 31:
        if (t.memoizedState !== null)
          return t.flags |= 128, Ii(t), null;
        break;
      case 13:
        var u = t.memoizedState;
        if (u !== null)
          return u.dehydrated !== null ? (ia(t), t.flags |= 128, null) : (a & t.child.childLanes) !== 0 ? t0(l, t, a) : (ia(t), l = Gt(
            l,
            t,
            a
          ), l !== null ? l.sibling : null);
        ia(t);
        break;
      case 19:
        var e = (l.flags & 128) !== 0;
        if (u = (a & t.childLanes) !== 0, u || (cu(
          l,
          t,
          a,
          !1
        ), u = (a & t.childLanes) !== 0), e) {
          if (u)
            return u0(
              l,
              t,
              a
            );
          t.flags |= 128;
        }
        if (e = t.memoizedState, e !== null && (e.rendering = null, e.tail = null, e.lastEffect = null), D(Sl, Sl.current), u) break;
        return null;
      case 22:
        return t.lanes = 0, Wo(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        aa(t, El, l.memoizedState.cache);
    }
    return Gt(l, t, a);
  }
  function e0(l, t, a) {
    if (l !== null)
      if (l.memoizedProps !== t.pendingProps)
        pl = !0;
      else {
        if (!Mc(l, a) && (t.flags & 128) === 0)
          return pl = !1, bm(
            l,
            t,
            a
          );
        pl = (l.flags & 131072) !== 0;
      }
    else
      pl = !1, F && (t.flags & 1048576) !== 0 && qs(t, Vu, t.index);
    switch (t.lanes = 0, t.tag) {
      case 16:
        l: {
          var u = t.pendingProps;
          if (l = qa(t.elementType), t.type = l, typeof l == "function")
            Ci(l) ? (u = Ga(l, u), t.tag = 1, t = Po(
              null,
              t,
              l,
              u,
              a
            )) : (t.tag = 0, t = zc(
              null,
              t,
              l,
              u,
              a
            ));
          else {
            if (l != null) {
              var e = l.$$typeof;
              if (e === ct) {
                t.tag = 11, t = Jo(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              } else if (e === k) {
                t.tag = 14, t = wo(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              }
            }
            throw t = Ut(l) || l, Error(f(306, t, ""));
          }
        }
        return t;
      case 0:
        return zc(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 1:
        return u = t.type, e = Ga(
          u,
          t.pendingProps
        ), Po(
          l,
          t,
          u,
          e,
          a
        );
      case 3:
        l: {
          if (jl(
            t,
            t.stateNode.containerInfo
          ), l === null) throw Error(f(387));
          u = t.pendingProps;
          var n = t.memoizedState;
          e = n.element, wi(l, t), Iu(t, u, null, a);
          var i = t.memoizedState;
          if (u = i.cache, aa(t, El, u), u !== n.cache && Qi(
            t,
            [El],
            a,
            !0
          ), Fu(), u = i.element, n.isDehydrated)
            if (n = {
              element: u,
              isDehydrated: !1,
              cache: i.cache
            }, t.updateQueue.baseState = n, t.memoizedState = n, t.flags & 256) {
              t = l0(
                l,
                t,
                u,
                a
              );
              break l;
            } else if (u !== e) {
              e = dt(
                Error(f(424)),
                t
              ), Ku(e), t = l0(
                l,
                t,
                u,
                a
              );
              break l;
            } else {
              switch (l = t.stateNode.containerInfo, l.nodeType) {
                case 9:
                  l = l.body;
                  break;
                default:
                  l = l.nodeName === "HTML" ? l.ownerDocument.body : l;
              }
              for (dl = rt(l.firstChild), Cl = t, F = !0, la = null, vt = !0, a = $s(
                t,
                null,
                u,
                a
              ), t.child = a; a; )
                a.flags = a.flags & -3 | 4096, a = a.sibling;
            }
          else {
            if (Ha(), u === e) {
              t = Gt(
                l,
                t,
                a
              );
              break l;
            }
            xl(l, t, u, a);
          }
          t = t.child;
        }
        return t;
      case 26:
        return vn(l, t), l === null ? (a = hd(
          t.type,
          null,
          t.pendingProps,
          null
        )) ? t.memoizedState = a : F || (a = t.type, l = t.pendingProps, u = Hn(
          K.current
        ).createElement(a), u[Hl] = t, u[Vl] = l, ql(u, a, l), Dl(u), t.stateNode = u) : t.memoizedState = hd(
          t.type,
          l.memoizedProps,
          t.pendingProps,
          l.memoizedState
        ), null;
      case 27:
        return Uu(t), l === null && F && (u = t.stateNode = yd(
          t.type,
          t.pendingProps,
          K.current
        ), Cl = t, vt = !0, e = dl, ha(t.type) ? (cf = e, dl = rt(u.firstChild)) : dl = e), xl(
          l,
          t,
          t.pendingProps.children,
          a
        ), vn(l, t), l === null && (t.flags |= 4194304), t.child;
      case 5:
        return l === null && F && ((e = u = dl) && (u = Wm(
          u,
          t.type,
          t.pendingProps,
          vt
        ), u !== null ? (t.stateNode = u, Cl = t, dl = rt(u.firstChild), vt = !1, e = !0) : e = !1), e || ta(t)), Uu(t), e = t.type, n = t.pendingProps, i = l !== null ? l.memoizedProps : null, u = n.children, tf(e, n) ? u = null : i !== null && tf(e, i) && (t.flags |= 32), t.memoizedState !== null && (e = lc(
          l,
          t,
          om,
          null,
          null,
          a
        ), Se._currentValue = e), vn(l, t), xl(l, t, u, a), t.child;
      case 6:
        return l === null && F && ((l = a = dl) && (a = km(
          a,
          t.pendingProps,
          vt
        ), a !== null ? (t.stateNode = a, Cl = t, dl = null, l = !0) : l = !1), l || ta(t)), null;
      case 13:
        return t0(l, t, a);
      case 4:
        return jl(
          t,
          t.stateNode.containerInfo
        ), u = t.pendingProps, l === null ? t.child = Ya(
          t,
          null,
          u,
          a
        ) : xl(l, t, u, a), t.child;
      case 11:
        return Jo(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 7:
        return xl(
          l,
          t,
          t.pendingProps,
          a
        ), t.child;
      case 8:
        return xl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 12:
        return xl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 10:
        return u = t.pendingProps, aa(t, t.type, u.value), xl(l, t, u.children, a), t.child;
      case 9:
        return e = t.type._context, u = t.pendingProps.children, Ra(t), e = Rl(e), u = u(e), t.flags |= 1, xl(l, t, u, a), t.child;
      case 14:
        return wo(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 15:
        return $o(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 19:
        return u0(l, t, a);
      case 31:
        return Sm(l, t, a);
      case 22:
        return Wo(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        return Ra(t), u = Rl(El), l === null ? (e = Vi(), e === null && (e = ol, n = Zi(), e.pooledCache = n, n.refCount++, n !== null && (e.pooledCacheLanes |= a), e = n), t.memoizedState = { parent: u, cache: e }, Ji(t), aa(t, El, e)) : ((l.lanes & a) !== 0 && (wi(l, t), Iu(t, null, null, a), Fu()), e = l.memoizedState, n = t.memoizedState, e.parent !== u ? (e = { parent: u, cache: u }, t.memoizedState = e, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = e), aa(t, El, u)) : (u = n.cache, aa(t, El, u), u !== e.cache && Qi(
          t,
          [El],
          a,
          !0
        ))), xl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 29:
        throw t.pendingProps;
    }
    throw Error(f(156, t.tag));
  }
  function Xt(l) {
    l.flags |= 4;
  }
  function Dc(l, t, a, u, e) {
    if ((t = (l.mode & 32) !== 0) && (t = !1), t) {
      if (l.flags |= 16777216, (e & 335544128) === e)
        if (l.stateNode.complete) l.flags |= 8192;
        else if (H0()) l.flags |= 8192;
        else
          throw Ba = Ie, Ki;
    } else l.flags &= -16777217;
  }
  function n0(l, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      l.flags &= -16777217;
    else if (l.flags |= 16777216, !zd(t))
      if (H0()) l.flags |= 8192;
      else
        throw Ba = Ie, Ki;
  }
  function rn(l, t) {
    t !== null && (l.flags |= 4), l.flags & 16384 && (t = l.tag !== 22 ? Yf() : 536870912, l.lanes |= t, bu |= t);
  }
  function ee(l, t) {
    if (!F)
      switch (l.tailMode) {
        case "hidden":
          t = l.tail;
          for (var a = null; t !== null; )
            t.alternate !== null && (a = t), t = t.sibling;
          a === null ? l.tail = null : a.sibling = null;
          break;
        case "collapsed":
          a = l.tail;
          for (var u = null; a !== null; )
            a.alternate !== null && (u = a), a = a.sibling;
          u === null ? t || l.tail === null ? l.tail = null : l.tail.sibling = null : u.sibling = null;
      }
  }
  function yl(l) {
    var t = l.alternate !== null && l.alternate.child === l.child, a = 0, u = 0;
    if (t)
      for (var e = l.child; e !== null; )
        a |= e.lanes | e.childLanes, u |= e.subtreeFlags & 65011712, u |= e.flags & 65011712, e.return = l, e = e.sibling;
    else
      for (e = l.child; e !== null; )
        a |= e.lanes | e.childLanes, u |= e.subtreeFlags, u |= e.flags, e.return = l, e = e.sibling;
    return l.subtreeFlags |= u, l.childLanes = a, t;
  }
  function zm(l, t, a) {
    var u = t.pendingProps;
    switch (Bi(t), t.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return yl(t), null;
      case 1:
        return yl(t), null;
      case 3:
        return a = t.stateNode, u = null, l !== null && (u = l.memoizedState.cache), t.memoizedState.cache !== u && (t.flags |= 2048), Bt(El), gl(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (l === null || l.child === null) && (iu(t) ? Xt(t) : l === null || l.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, ji())), yl(t), null;
      case 26:
        var e = t.type, n = t.memoizedState;
        return l === null ? (Xt(t), n !== null ? (yl(t), n0(t, n)) : (yl(t), Dc(
          t,
          e,
          null,
          u,
          a
        ))) : n ? n !== l.memoizedState ? (Xt(t), yl(t), n0(t, n)) : (yl(t), t.flags &= -16777217) : (l = l.memoizedProps, l !== u && Xt(t), yl(t), Dc(
          t,
          e,
          l,
          u,
          a
        )), null;
      case 27:
        if (Oe(t), a = K.current, e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && Xt(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(f(166));
            return yl(t), null;
          }
          l = H.current, iu(t) ? Ys(t) : (l = yd(e, u, a), t.stateNode = l, Xt(t));
        }
        return yl(t), null;
      case 5:
        if (Oe(t), e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && Xt(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(f(166));
            return yl(t), null;
          }
          if (n = H.current, iu(t))
            Ys(t);
          else {
            var i = Hn(
              K.current
            );
            switch (n) {
              case 1:
                n = i.createElementNS(
                  "http://www.w3.org/2000/svg",
                  e
                );
                break;
              case 2:
                n = i.createElementNS(
                  "http://www.w3.org/1998/Math/MathML",
                  e
                );
                break;
              default:
                switch (e) {
                  case "svg":
                    n = i.createElementNS(
                      "http://www.w3.org/2000/svg",
                      e
                    );
                    break;
                  case "math":
                    n = i.createElementNS(
                      "http://www.w3.org/1998/Math/MathML",
                      e
                    );
                    break;
                  case "script":
                    n = i.createElement("div"), n.innerHTML = "<script><\/script>", n = n.removeChild(
                      n.firstChild
                    );
                    break;
                  case "select":
                    n = typeof u.is == "string" ? i.createElement("select", {
                      is: u.is
                    }) : i.createElement("select"), u.multiple ? n.multiple = !0 : u.size && (n.size = u.size);
                    break;
                  default:
                    n = typeof u.is == "string" ? i.createElement(e, { is: u.is }) : i.createElement(e);
                }
            }
            n[Hl] = t, n[Vl] = u;
            l: for (i = t.child; i !== null; ) {
              if (i.tag === 5 || i.tag === 6)
                n.appendChild(i.stateNode);
              else if (i.tag !== 4 && i.tag !== 27 && i.child !== null) {
                i.child.return = i, i = i.child;
                continue;
              }
              if (i === t) break l;
              for (; i.sibling === null; ) {
                if (i.return === null || i.return === t)
                  break l;
                i = i.return;
              }
              i.sibling.return = i.return, i = i.sibling;
            }
            t.stateNode = n;
            l: switch (ql(n, e, u), e) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                u = !!u.autoFocus;
                break l;
              case "img":
                u = !0;
                break l;
              default:
                u = !1;
            }
            u && Xt(t);
          }
        }
        return yl(t), Dc(
          t,
          t.type,
          l === null ? null : l.memoizedProps,
          t.pendingProps,
          a
        ), null;
      case 6:
        if (l && t.stateNode != null)
          l.memoizedProps !== u && Xt(t);
        else {
          if (typeof u != "string" && t.stateNode === null)
            throw Error(f(166));
          if (l = K.current, iu(t)) {
            if (l = t.stateNode, a = t.memoizedProps, u = null, e = Cl, e !== null)
              switch (e.tag) {
                case 27:
                case 5:
                  u = e.memoizedProps;
              }
            l[Hl] = t, l = !!(l.nodeValue === a || u !== null && u.suppressHydrationWarning === !0 || td(l.nodeValue, a)), l || ta(t, !0);
          } else
            l = Hn(l).createTextNode(
              u
            ), l[Hl] = t, t.stateNode = l;
        }
        return yl(t), null;
      case 31:
        if (a = t.memoizedState, l === null || l.memoizedState !== null) {
          if (u = iu(t), a !== null) {
            if (l === null) {
              if (!u) throw Error(f(318));
              if (l = t.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(f(557));
              l[Hl] = t;
            } else
              Ha(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            yl(t), l = !1;
          } else
            a = ji(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = a), l = !0;
          if (!l)
            return t.flags & 256 ? (ut(t), t) : (ut(t), null);
          if ((t.flags & 128) !== 0)
            throw Error(f(558));
        }
        return yl(t), null;
      case 13:
        if (u = t.memoizedState, l === null || l.memoizedState !== null && l.memoizedState.dehydrated !== null) {
          if (e = iu(t), u !== null && u.dehydrated !== null) {
            if (l === null) {
              if (!e) throw Error(f(318));
              if (e = t.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(f(317));
              e[Hl] = t;
            } else
              Ha(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            yl(t), e = !1;
          } else
            e = ji(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = e), e = !0;
          if (!e)
            return t.flags & 256 ? (ut(t), t) : (ut(t), null);
        }
        return ut(t), (t.flags & 128) !== 0 ? (t.lanes = a, t) : (a = u !== null, l = l !== null && l.memoizedState !== null, a && (u = t.child, e = null, u.alternate !== null && u.alternate.memoizedState !== null && u.alternate.memoizedState.cachePool !== null && (e = u.alternate.memoizedState.cachePool.pool), n = null, u.memoizedState !== null && u.memoizedState.cachePool !== null && (n = u.memoizedState.cachePool.pool), n !== e && (u.flags |= 2048)), a !== l && a && (t.child.flags |= 8192), rn(t, t.updateQueue), yl(t), null);
      case 4:
        return gl(), l === null && kc(t.stateNode.containerInfo), yl(t), null;
      case 10:
        return Bt(t.type), yl(t), null;
      case 19:
        if (_(Sl), u = t.memoizedState, u === null) return yl(t), null;
        if (e = (t.flags & 128) !== 0, n = u.rendering, n === null)
          if (e) ee(u, !1);
          else {
            if (rl !== 0 || l !== null && (l.flags & 128) !== 0)
              for (l = t.child; l !== null; ) {
                if (n = an(l), n !== null) {
                  for (t.flags |= 128, ee(u, !1), l = n.updateQueue, t.updateQueue = l, rn(t, l), t.subtreeFlags = 0, l = a, a = t.child; a !== null; )
                    Cs(a, l), a = a.sibling;
                  return D(
                    Sl,
                    Sl.current & 1 | 2
                  ), F && xt(t, u.treeForkCount), t.child;
                }
                l = l.sibling;
              }
            u.tail !== null && Fl() > En && (t.flags |= 128, e = !0, ee(u, !1), t.lanes = 4194304);
          }
        else {
          if (!e)
            if (l = an(n), l !== null) {
              if (t.flags |= 128, e = !0, l = l.updateQueue, t.updateQueue = l, rn(t, l), ee(u, !0), u.tail === null && u.tailMode === "hidden" && !n.alternate && !F)
                return yl(t), null;
            } else
              2 * Fl() - u.renderingStartTime > En && a !== 536870912 && (t.flags |= 128, e = !0, ee(u, !1), t.lanes = 4194304);
          u.isBackwards ? (n.sibling = t.child, t.child = n) : (l = u.last, l !== null ? l.sibling = n : t.child = n, u.last = n);
        }
        return u.tail !== null ? (l = u.tail, u.rendering = l, u.tail = l.sibling, u.renderingStartTime = Fl(), l.sibling = null, a = Sl.current, D(
          Sl,
          e ? a & 1 | 2 : a & 1
        ), F && xt(t, u.treeForkCount), l) : (yl(t), null);
      case 22:
      case 23:
        return ut(t), Fi(), u = t.memoizedState !== null, l !== null ? l.memoizedState !== null !== u && (t.flags |= 8192) : u && (t.flags |= 8192), u ? (a & 536870912) !== 0 && (t.flags & 128) === 0 && (yl(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : yl(t), a = t.updateQueue, a !== null && rn(t, a.retryQueue), a = null, l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), u = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (u = t.memoizedState.cachePool.pool), u !== a && (t.flags |= 2048), l !== null && _(xa), null;
      case 24:
        return a = null, l !== null && (a = l.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), Bt(El), yl(t), null;
      case 25:
        return null;
      case 30:
        return null;
    }
    throw Error(f(156, t.tag));
  }
  function Em(l, t) {
    switch (Bi(t), t.tag) {
      case 1:
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 3:
        return Bt(El), gl(), l = t.flags, (l & 65536) !== 0 && (l & 128) === 0 ? (t.flags = l & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return Oe(t), null;
      case 31:
        if (t.memoizedState !== null) {
          if (ut(t), t.alternate === null)
            throw Error(f(340));
          Ha();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 13:
        if (ut(t), l = t.memoizedState, l !== null && l.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(f(340));
          Ha();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 19:
        return _(Sl), null;
      case 4:
        return gl(), null;
      case 10:
        return Bt(t.type), null;
      case 22:
      case 23:
        return ut(t), Fi(), l !== null && _(xa), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 24:
        return Bt(El), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function i0(l, t) {
    switch (Bi(t), t.tag) {
      case 3:
        Bt(El), gl();
        break;
      case 26:
      case 27:
      case 5:
        Oe(t);
        break;
      case 4:
        gl();
        break;
      case 31:
        t.memoizedState !== null && ut(t);
        break;
      case 13:
        ut(t);
        break;
      case 19:
        _(Sl);
        break;
      case 10:
        Bt(t.type);
        break;
      case 22:
      case 23:
        ut(t), Fi(), l !== null && _(xa);
        break;
      case 24:
        Bt(El);
    }
  }
  function ne(l, t) {
    try {
      var a = t.updateQueue, u = a !== null ? a.lastEffect : null;
      if (u !== null) {
        var e = u.next;
        a = e;
        do {
          if ((a.tag & l) === l) {
            u = void 0;
            var n = a.create, i = a.inst;
            u = n(), i.destroy = u;
          }
          a = a.next;
        } while (a !== e);
      }
    } catch (c) {
      ul(t, t.return, c);
    }
  }
  function fa(l, t, a) {
    try {
      var u = t.updateQueue, e = u !== null ? u.lastEffect : null;
      if (e !== null) {
        var n = e.next;
        u = n;
        do {
          if ((u.tag & l) === l) {
            var i = u.inst, c = i.destroy;
            if (c !== void 0) {
              i.destroy = void 0, e = t;
              var s = a, r = c;
              try {
                r();
              } catch (z) {
                ul(
                  e,
                  s,
                  z
                );
              }
            }
          }
          u = u.next;
        } while (u !== n);
      }
    } catch (z) {
      ul(t, t.return, z);
    }
  }
  function c0(l) {
    var t = l.updateQueue;
    if (t !== null) {
      var a = l.stateNode;
      try {
        ks(t, a);
      } catch (u) {
        ul(l, l.return, u);
      }
    }
  }
  function f0(l, t, a) {
    a.props = Ga(
      l.type,
      l.memoizedProps
    ), a.state = l.memoizedState;
    try {
      a.componentWillUnmount();
    } catch (u) {
      ul(l, t, u);
    }
  }
  function ie(l, t) {
    try {
      var a = l.ref;
      if (a !== null) {
        switch (l.tag) {
          case 26:
          case 27:
          case 5:
            var u = l.stateNode;
            break;
          case 30:
            u = l.stateNode;
            break;
          default:
            u = l.stateNode;
        }
        typeof a == "function" ? l.refCleanup = a(u) : a.current = u;
      }
    } catch (e) {
      ul(l, t, e);
    }
  }
  function Mt(l, t) {
    var a = l.ref, u = l.refCleanup;
    if (a !== null)
      if (typeof u == "function")
        try {
          u();
        } catch (e) {
          ul(l, t, e);
        } finally {
          l.refCleanup = null, l = l.alternate, l != null && (l.refCleanup = null);
        }
      else if (typeof a == "function")
        try {
          a(null);
        } catch (e) {
          ul(l, t, e);
        }
      else a.current = null;
  }
  function s0(l) {
    var t = l.type, a = l.memoizedProps, u = l.stateNode;
    try {
      l: switch (t) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          a.autoFocus && u.focus();
          break l;
        case "img":
          a.src ? u.src = a.src : a.srcSet && (u.srcset = a.srcSet);
      }
    } catch (e) {
      ul(l, l.return, e);
    }
  }
  function Uc(l, t, a) {
    try {
      var u = l.stateNode;
      Lm(u, l.type, a, t), u[Vl] = t;
    } catch (e) {
      ul(l, l.return, e);
    }
  }
  function o0(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 26 || l.tag === 27 && ha(l.type) || l.tag === 4;
  }
  function Nc(l) {
    l: for (; ; ) {
      for (; l.sibling === null; ) {
        if (l.return === null || o0(l.return)) return null;
        l = l.return;
      }
      for (l.sibling.return = l.return, l = l.sibling; l.tag !== 5 && l.tag !== 6 && l.tag !== 18; ) {
        if (l.tag === 27 && ha(l.type) || l.flags & 2 || l.child === null || l.tag === 4) continue l;
        l.child.return = l, l = l.child;
      }
      if (!(l.flags & 2)) return l.stateNode;
    }
  }
  function Hc(l, t, a) {
    var u = l.tag;
    if (u === 5 || u === 6)
      l = l.stateNode, t ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(l, t) : (t = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, t.appendChild(l), a = a._reactRootContainer, a != null || t.onclick !== null || (t.onclick = Ht));
    else if (u !== 4 && (u === 27 && ha(l.type) && (a = l.stateNode, t = null), l = l.child, l !== null))
      for (Hc(l, t, a), l = l.sibling; l !== null; )
        Hc(l, t, a), l = l.sibling;
  }
  function gn(l, t, a) {
    var u = l.tag;
    if (u === 5 || u === 6)
      l = l.stateNode, t ? a.insertBefore(l, t) : a.appendChild(l);
    else if (u !== 4 && (u === 27 && ha(l.type) && (a = l.stateNode), l = l.child, l !== null))
      for (gn(l, t, a), l = l.sibling; l !== null; )
        gn(l, t, a), l = l.sibling;
  }
  function d0(l) {
    var t = l.stateNode, a = l.memoizedProps;
    try {
      for (var u = l.type, e = t.attributes; e.length; )
        t.removeAttributeNode(e[0]);
      ql(t, u, a), t[Hl] = l, t[Vl] = a;
    } catch (n) {
      ul(l, l.return, n);
    }
  }
  var Qt = !1, Al = !1, Cc = !1, y0 = typeof WeakSet == "function" ? WeakSet : Set, Ul = null;
  function Tm(l, t) {
    if (l = l.containerInfo, Pc = jn, l = ps(l), _i(l)) {
      if ("selectionStart" in l)
        var a = {
          start: l.selectionStart,
          end: l.selectionEnd
        };
      else
        l: {
          a = (a = l.ownerDocument) && a.defaultView || window;
          var u = a.getSelection && a.getSelection();
          if (u && u.rangeCount !== 0) {
            a = u.anchorNode;
            var e = u.anchorOffset, n = u.focusNode;
            u = u.focusOffset;
            try {
              a.nodeType, n.nodeType;
            } catch {
              a = null;
              break l;
            }
            var i = 0, c = -1, s = -1, r = 0, z = 0, A = l, g = null;
            t: for (; ; ) {
              for (var b; A !== a || e !== 0 && A.nodeType !== 3 || (c = i + e), A !== n || u !== 0 && A.nodeType !== 3 || (s = i + u), A.nodeType === 3 && (i += A.nodeValue.length), (b = A.firstChild) !== null; )
                g = A, A = b;
              for (; ; ) {
                if (A === l) break t;
                if (g === a && ++r === e && (c = i), g === n && ++z === u && (s = i), (b = A.nextSibling) !== null) break;
                A = g, g = A.parentNode;
              }
              A = b;
            }
            a = c === -1 || s === -1 ? null : { start: c, end: s };
          } else a = null;
        }
      a = a || { start: 0, end: 0 };
    } else a = null;
    for (lf = { focusedElem: l, selectionRange: a }, jn = !1, Ul = t; Ul !== null; )
      if (t = Ul, l = t.child, (t.subtreeFlags & 1028) !== 0 && l !== null)
        l.return = t, Ul = l;
      else
        for (; Ul !== null; ) {
          switch (t = Ul, n = t.alternate, l = t.flags, t.tag) {
            case 0:
              if ((l & 4) !== 0 && (l = t.updateQueue, l = l !== null ? l.events : null, l !== null))
                for (a = 0; a < l.length; a++)
                  e = l[a], e.ref.impl = e.nextImpl;
              break;
            case 11:
            case 15:
              break;
            case 1:
              if ((l & 1024) !== 0 && n !== null) {
                l = void 0, a = t, e = n.memoizedProps, n = n.memoizedState, u = a.stateNode;
                try {
                  var N = Ga(
                    a.type,
                    e
                  );
                  l = u.getSnapshotBeforeUpdate(
                    N,
                    n
                  ), u.__reactInternalSnapshotBeforeUpdate = l;
                } catch (B) {
                  ul(
                    a,
                    a.return,
                    B
                  );
                }
              }
              break;
            case 3:
              if ((l & 1024) !== 0) {
                if (l = t.stateNode.containerInfo, a = l.nodeType, a === 9)
                  uf(l);
                else if (a === 1)
                  switch (l.nodeName) {
                    case "HEAD":
                    case "HTML":
                    case "BODY":
                      uf(l);
                      break;
                    default:
                      l.textContent = "";
                  }
              }
              break;
            case 5:
            case 26:
            case 27:
            case 6:
            case 4:
            case 17:
              break;
            default:
              if ((l & 1024) !== 0) throw Error(f(163));
          }
          if (l = t.sibling, l !== null) {
            l.return = t.return, Ul = l;
            break;
          }
          Ul = t.return;
        }
  }
  function m0(l, t, a) {
    var u = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        Lt(l, a), u & 4 && ne(5, a);
        break;
      case 1:
        if (Lt(l, a), u & 4)
          if (l = a.stateNode, t === null)
            try {
              l.componentDidMount();
            } catch (i) {
              ul(a, a.return, i);
            }
          else {
            var e = Ga(
              a.type,
              t.memoizedProps
            );
            t = t.memoizedState;
            try {
              l.componentDidUpdate(
                e,
                t,
                l.__reactInternalSnapshotBeforeUpdate
              );
            } catch (i) {
              ul(
                a,
                a.return,
                i
              );
            }
          }
        u & 64 && c0(a), u & 512 && ie(a, a.return);
        break;
      case 3:
        if (Lt(l, a), u & 64 && (l = a.updateQueue, l !== null)) {
          if (t = null, a.child !== null)
            switch (a.child.tag) {
              case 27:
              case 5:
                t = a.child.stateNode;
                break;
              case 1:
                t = a.child.stateNode;
            }
          try {
            ks(l, t);
          } catch (i) {
            ul(a, a.return, i);
          }
        }
        break;
      case 27:
        t === null && u & 4 && d0(a);
      case 26:
      case 5:
        Lt(l, a), t === null && u & 4 && s0(a), u & 512 && ie(a, a.return);
        break;
      case 12:
        Lt(l, a);
        break;
      case 31:
        Lt(l, a), u & 4 && r0(l, a);
        break;
      case 13:
        Lt(l, a), u & 4 && g0(l, a), u & 64 && (l = a.memoizedState, l !== null && (l = l.dehydrated, l !== null && (a = Hm.bind(
          null,
          a
        ), Fm(l, a))));
        break;
      case 22:
        if (u = a.memoizedState !== null || Qt, !u) {
          t = t !== null && t.memoizedState !== null || Al, e = Qt;
          var n = Al;
          Qt = u, (Al = t) && !n ? Vt(
            l,
            a,
            (a.subtreeFlags & 8772) !== 0
          ) : Lt(l, a), Qt = e, Al = n;
        }
        break;
      case 30:
        break;
      default:
        Lt(l, a);
    }
  }
  function v0(l) {
    var t = l.alternate;
    t !== null && (l.alternate = null, v0(t)), l.child = null, l.deletions = null, l.sibling = null, l.tag === 5 && (t = l.stateNode, t !== null && fi(t)), l.stateNode = null, l.return = null, l.dependencies = null, l.memoizedProps = null, l.memoizedState = null, l.pendingProps = null, l.stateNode = null, l.updateQueue = null;
  }
  var ml = null, Jl = !1;
  function Zt(l, t, a) {
    for (a = a.child; a !== null; )
      h0(l, t, a), a = a.sibling;
  }
  function h0(l, t, a) {
    if (Il && typeof Il.onCommitFiberUnmount == "function")
      try {
        Il.onCommitFiberUnmount(Nu, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        Al || Mt(a, t), Zt(
          l,
          t,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        Al || Mt(a, t);
        var u = ml, e = Jl;
        ha(a.type) && (ml = a.stateNode, Jl = !1), Zt(
          l,
          t,
          a
        ), he(a.stateNode), ml = u, Jl = e;
        break;
      case 5:
        Al || Mt(a, t);
      case 6:
        if (u = ml, e = Jl, ml = null, Zt(
          l,
          t,
          a
        ), ml = u, Jl = e, ml !== null)
          if (Jl)
            try {
              (ml.nodeType === 9 ? ml.body : ml.nodeName === "HTML" ? ml.ownerDocument.body : ml).removeChild(a.stateNode);
            } catch (n) {
              ul(
                a,
                t,
                n
              );
            }
          else
            try {
              ml.removeChild(a.stateNode);
            } catch (n) {
              ul(
                a,
                t,
                n
              );
            }
        break;
      case 18:
        ml !== null && (Jl ? (l = ml, cd(
          l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l,
          a.stateNode
        ), Mu(l)) : cd(ml, a.stateNode));
        break;
      case 4:
        u = ml, e = Jl, ml = a.stateNode.containerInfo, Jl = !0, Zt(
          l,
          t,
          a
        ), ml = u, Jl = e;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        fa(2, a, t), Al || fa(4, a, t), Zt(
          l,
          t,
          a
        );
        break;
      case 1:
        Al || (Mt(a, t), u = a.stateNode, typeof u.componentWillUnmount == "function" && f0(
          a,
          t,
          u
        )), Zt(
          l,
          t,
          a
        );
        break;
      case 21:
        Zt(
          l,
          t,
          a
        );
        break;
      case 22:
        Al = (u = Al) || a.memoizedState !== null, Zt(
          l,
          t,
          a
        ), Al = u;
        break;
      default:
        Zt(
          l,
          t,
          a
        );
    }
  }
  function r0(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null))) {
      l = l.dehydrated;
      try {
        Mu(l);
      } catch (a) {
        ul(t, t.return, a);
      }
    }
  }
  function g0(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null && (l = l.dehydrated, l !== null))))
      try {
        Mu(l);
      } catch (a) {
        ul(t, t.return, a);
      }
  }
  function pm(l) {
    switch (l.tag) {
      case 31:
      case 13:
      case 19:
        var t = l.stateNode;
        return t === null && (t = l.stateNode = new y0()), t;
      case 22:
        return l = l.stateNode, t = l._retryCache, t === null && (t = l._retryCache = new y0()), t;
      default:
        throw Error(f(435, l.tag));
    }
  }
  function Sn(l, t) {
    var a = pm(l);
    t.forEach(function(u) {
      if (!a.has(u)) {
        a.add(u);
        var e = Cm.bind(null, l, u);
        u.then(e, e);
      }
    });
  }
  function wl(l, t) {
    var a = t.deletions;
    if (a !== null)
      for (var u = 0; u < a.length; u++) {
        var e = a[u], n = l, i = t, c = i;
        l: for (; c !== null; ) {
          switch (c.tag) {
            case 27:
              if (ha(c.type)) {
                ml = c.stateNode, Jl = !1;
                break l;
              }
              break;
            case 5:
              ml = c.stateNode, Jl = !1;
              break l;
            case 3:
            case 4:
              ml = c.stateNode.containerInfo, Jl = !0;
              break l;
          }
          c = c.return;
        }
        if (ml === null) throw Error(f(160));
        h0(n, i, e), ml = null, Jl = !1, n = e.alternate, n !== null && (n.return = null), e.return = null;
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; )
        S0(t, l), t = t.sibling;
  }
  var zt = null;
  function S0(l, t) {
    var a = l.alternate, u = l.flags;
    switch (l.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        wl(t, l), $l(l), u & 4 && (fa(3, l, l.return), ne(3, l), fa(5, l, l.return));
        break;
      case 1:
        wl(t, l), $l(l), u & 512 && (Al || a === null || Mt(a, a.return)), u & 64 && Qt && (l = l.updateQueue, l !== null && (u = l.callbacks, u !== null && (a = l.shared.hiddenCallbacks, l.shared.hiddenCallbacks = a === null ? u : a.concat(u))));
        break;
      case 26:
        var e = zt;
        if (wl(t, l), $l(l), u & 512 && (Al || a === null || Mt(a, a.return)), u & 4) {
          var n = a !== null ? a.memoizedState : null;
          if (u = l.memoizedState, a === null)
            if (u === null)
              if (l.stateNode === null) {
                l: {
                  u = l.type, a = l.memoizedProps, e = e.ownerDocument || e;
                  t: switch (u) {
                    case "title":
                      n = e.getElementsByTagName("title")[0], (!n || n[Ru] || n[Hl] || n.namespaceURI === "http://www.w3.org/2000/svg" || n.hasAttribute("itemprop")) && (n = e.createElement(u), e.head.insertBefore(
                        n,
                        e.querySelector("head > title")
                      )), ql(n, u, a), n[Hl] = l, Dl(n), u = n;
                      break l;
                    case "link":
                      var i = Sd(
                        "link",
                        "href",
                        e
                      ).get(u + (a.href || ""));
                      if (i) {
                        for (var c = 0; c < i.length; c++)
                          if (n = i[c], n.getAttribute("href") === (a.href == null || a.href === "" ? null : a.href) && n.getAttribute("rel") === (a.rel == null ? null : a.rel) && n.getAttribute("title") === (a.title == null ? null : a.title) && n.getAttribute("crossorigin") === (a.crossOrigin == null ? null : a.crossOrigin)) {
                            i.splice(c, 1);
                            break t;
                          }
                      }
                      n = e.createElement(u), ql(n, u, a), e.head.appendChild(n);
                      break;
                    case "meta":
                      if (i = Sd(
                        "meta",
                        "content",
                        e
                      ).get(u + (a.content || ""))) {
                        for (c = 0; c < i.length; c++)
                          if (n = i[c], n.getAttribute("content") === (a.content == null ? null : "" + a.content) && n.getAttribute("name") === (a.name == null ? null : a.name) && n.getAttribute("property") === (a.property == null ? null : a.property) && n.getAttribute("http-equiv") === (a.httpEquiv == null ? null : a.httpEquiv) && n.getAttribute("charset") === (a.charSet == null ? null : a.charSet)) {
                            i.splice(c, 1);
                            break t;
                          }
                      }
                      n = e.createElement(u), ql(n, u, a), e.head.appendChild(n);
                      break;
                    default:
                      throw Error(f(468, u));
                  }
                  n[Hl] = l, Dl(n), u = n;
                }
                l.stateNode = u;
              } else
                bd(
                  e,
                  l.type,
                  l.stateNode
                );
            else
              l.stateNode = gd(
                e,
                u,
                l.memoizedProps
              );
          else
            n !== u ? (n === null ? a.stateNode !== null && (a = a.stateNode, a.parentNode.removeChild(a)) : n.count--, u === null ? bd(
              e,
              l.type,
              l.stateNode
            ) : gd(
              e,
              u,
              l.memoizedProps
            )) : u === null && l.stateNode !== null && Uc(
              l,
              l.memoizedProps,
              a.memoizedProps
            );
        }
        break;
      case 27:
        wl(t, l), $l(l), u & 512 && (Al || a === null || Mt(a, a.return)), a !== null && u & 4 && Uc(
          l,
          l.memoizedProps,
          a.memoizedProps
        );
        break;
      case 5:
        if (wl(t, l), $l(l), u & 512 && (Al || a === null || Mt(a, a.return)), l.flags & 32) {
          e = l.stateNode;
          try {
            ka(e, "");
          } catch (N) {
            ul(l, l.return, N);
          }
        }
        u & 4 && l.stateNode != null && (e = l.memoizedProps, Uc(
          l,
          e,
          a !== null ? a.memoizedProps : e
        )), u & 1024 && (Cc = !0);
        break;
      case 6:
        if (wl(t, l), $l(l), u & 4) {
          if (l.stateNode === null)
            throw Error(f(162));
          u = l.memoizedProps, a = l.stateNode;
          try {
            a.nodeValue = u;
          } catch (N) {
            ul(l, l.return, N);
          }
        }
        break;
      case 3:
        if (xn = null, e = zt, zt = Cn(t.containerInfo), wl(t, l), zt = e, $l(l), u & 4 && a !== null && a.memoizedState.isDehydrated)
          try {
            Mu(t.containerInfo);
          } catch (N) {
            ul(l, l.return, N);
          }
        Cc && (Cc = !1, b0(l));
        break;
      case 4:
        u = zt, zt = Cn(
          l.stateNode.containerInfo
        ), wl(t, l), $l(l), zt = u;
        break;
      case 12:
        wl(t, l), $l(l);
        break;
      case 31:
        wl(t, l), $l(l), u & 4 && (u = l.updateQueue, u !== null && (l.updateQueue = null, Sn(l, u)));
        break;
      case 13:
        wl(t, l), $l(l), l.child.flags & 8192 && l.memoizedState !== null != (a !== null && a.memoizedState !== null) && (zn = Fl()), u & 4 && (u = l.updateQueue, u !== null && (l.updateQueue = null, Sn(l, u)));
        break;
      case 22:
        e = l.memoizedState !== null;
        var s = a !== null && a.memoizedState !== null, r = Qt, z = Al;
        if (Qt = r || e, Al = z || s, wl(t, l), Al = z, Qt = r, $l(l), u & 8192)
          l: for (t = l.stateNode, t._visibility = e ? t._visibility & -2 : t._visibility | 1, e && (a === null || s || Qt || Al || Xa(l)), a = null, t = l; ; ) {
            if (t.tag === 5 || t.tag === 26) {
              if (a === null) {
                s = a = t;
                try {
                  if (n = s.stateNode, e)
                    i = n.style, typeof i.setProperty == "function" ? i.setProperty("display", "none", "important") : i.display = "none";
                  else {
                    c = s.stateNode;
                    var A = s.memoizedProps.style, g = A != null && A.hasOwnProperty("display") ? A.display : null;
                    c.style.display = g == null || typeof g == "boolean" ? "" : ("" + g).trim();
                  }
                } catch (N) {
                  ul(s, s.return, N);
                }
              }
            } else if (t.tag === 6) {
              if (a === null) {
                s = t;
                try {
                  s.stateNode.nodeValue = e ? "" : s.memoizedProps;
                } catch (N) {
                  ul(s, s.return, N);
                }
              }
            } else if (t.tag === 18) {
              if (a === null) {
                s = t;
                try {
                  var b = s.stateNode;
                  e ? fd(b, !0) : fd(s.stateNode, !1);
                } catch (N) {
                  ul(s, s.return, N);
                }
              }
            } else if ((t.tag !== 22 && t.tag !== 23 || t.memoizedState === null || t === l) && t.child !== null) {
              t.child.return = t, t = t.child;
              continue;
            }
            if (t === l) break l;
            for (; t.sibling === null; ) {
              if (t.return === null || t.return === l) break l;
              a === t && (a = null), t = t.return;
            }
            a === t && (a = null), t.sibling.return = t.return, t = t.sibling;
          }
        u & 4 && (u = l.updateQueue, u !== null && (a = u.retryQueue, a !== null && (u.retryQueue = null, Sn(l, a))));
        break;
      case 19:
        wl(t, l), $l(l), u & 4 && (u = l.updateQueue, u !== null && (l.updateQueue = null, Sn(l, u)));
        break;
      case 30:
        break;
      case 21:
        break;
      default:
        wl(t, l), $l(l);
    }
  }
  function $l(l) {
    var t = l.flags;
    if (t & 2) {
      try {
        for (var a, u = l.return; u !== null; ) {
          if (o0(u)) {
            a = u;
            break;
          }
          u = u.return;
        }
        if (a == null) throw Error(f(160));
        switch (a.tag) {
          case 27:
            var e = a.stateNode, n = Nc(l);
            gn(l, n, e);
            break;
          case 5:
            var i = a.stateNode;
            a.flags & 32 && (ka(i, ""), a.flags &= -33);
            var c = Nc(l);
            gn(l, c, i);
            break;
          case 3:
          case 4:
            var s = a.stateNode.containerInfo, r = Nc(l);
            Hc(
              l,
              r,
              s
            );
            break;
          default:
            throw Error(f(161));
        }
      } catch (z) {
        ul(l, l.return, z);
      }
      l.flags &= -3;
    }
    t & 4096 && (l.flags &= -4097);
  }
  function b0(l) {
    if (l.subtreeFlags & 1024)
      for (l = l.child; l !== null; ) {
        var t = l;
        b0(t), t.tag === 5 && t.flags & 1024 && t.stateNode.reset(), l = l.sibling;
      }
  }
  function Lt(l, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; )
        m0(l, t.alternate, t), t = t.sibling;
  }
  function Xa(l) {
    for (l = l.child; l !== null; ) {
      var t = l;
      switch (t.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          fa(4, t, t.return), Xa(t);
          break;
        case 1:
          Mt(t, t.return);
          var a = t.stateNode;
          typeof a.componentWillUnmount == "function" && f0(
            t,
            t.return,
            a
          ), Xa(t);
          break;
        case 27:
          he(t.stateNode);
        case 26:
        case 5:
          Mt(t, t.return), Xa(t);
          break;
        case 22:
          t.memoizedState === null && Xa(t);
          break;
        case 30:
          Xa(t);
          break;
        default:
          Xa(t);
      }
      l = l.sibling;
    }
  }
  function Vt(l, t, a) {
    for (a = a && (t.subtreeFlags & 8772) !== 0, t = t.child; t !== null; ) {
      var u = t.alternate, e = l, n = t, i = n.flags;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          Vt(
            e,
            n,
            a
          ), ne(4, n);
          break;
        case 1:
          if (Vt(
            e,
            n,
            a
          ), u = n, e = u.stateNode, typeof e.componentDidMount == "function")
            try {
              e.componentDidMount();
            } catch (r) {
              ul(u, u.return, r);
            }
          if (u = n, e = u.updateQueue, e !== null) {
            var c = u.stateNode;
            try {
              var s = e.shared.hiddenCallbacks;
              if (s !== null)
                for (e.shared.hiddenCallbacks = null, e = 0; e < s.length; e++)
                  Ws(s[e], c);
            } catch (r) {
              ul(u, u.return, r);
            }
          }
          a && i & 64 && c0(n), ie(n, n.return);
          break;
        case 27:
          d0(n);
        case 26:
        case 5:
          Vt(
            e,
            n,
            a
          ), a && u === null && i & 4 && s0(n), ie(n, n.return);
          break;
        case 12:
          Vt(
            e,
            n,
            a
          );
          break;
        case 31:
          Vt(
            e,
            n,
            a
          ), a && i & 4 && r0(e, n);
          break;
        case 13:
          Vt(
            e,
            n,
            a
          ), a && i & 4 && g0(e, n);
          break;
        case 22:
          n.memoizedState === null && Vt(
            e,
            n,
            a
          ), ie(n, n.return);
          break;
        case 30:
          break;
        default:
          Vt(
            e,
            n,
            a
          );
      }
      t = t.sibling;
    }
  }
  function Rc(l, t) {
    var a = null;
    l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), l = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), l !== a && (l != null && l.refCount++, a != null && Ju(a));
  }
  function xc(l, t) {
    l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && Ju(l));
  }
  function Et(l, t, a, u) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; )
        z0(
          l,
          t,
          a,
          u
        ), t = t.sibling;
  }
  function z0(l, t, a, u) {
    var e = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        Et(
          l,
          t,
          a,
          u
        ), e & 2048 && ne(9, t);
        break;
      case 1:
        Et(
          l,
          t,
          a,
          u
        );
        break;
      case 3:
        Et(
          l,
          t,
          a,
          u
        ), e & 2048 && (l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && Ju(l)));
        break;
      case 12:
        if (e & 2048) {
          Et(
            l,
            t,
            a,
            u
          ), l = t.stateNode;
          try {
            var n = t.memoizedProps, i = n.id, c = n.onPostCommit;
            typeof c == "function" && c(
              i,
              t.alternate === null ? "mount" : "update",
              l.passiveEffectDuration,
              -0
            );
          } catch (s) {
            ul(t, t.return, s);
          }
        } else
          Et(
            l,
            t,
            a,
            u
          );
        break;
      case 31:
        Et(
          l,
          t,
          a,
          u
        );
        break;
      case 13:
        Et(
          l,
          t,
          a,
          u
        );
        break;
      case 23:
        break;
      case 22:
        n = t.stateNode, i = t.alternate, t.memoizedState !== null ? n._visibility & 2 ? Et(
          l,
          t,
          a,
          u
        ) : ce(l, t) : n._visibility & 2 ? Et(
          l,
          t,
          a,
          u
        ) : (n._visibility |= 2, ru(
          l,
          t,
          a,
          u,
          (t.subtreeFlags & 10256) !== 0 || !1
        )), e & 2048 && Rc(i, t);
        break;
      case 24:
        Et(
          l,
          t,
          a,
          u
        ), e & 2048 && xc(t.alternate, t);
        break;
      default:
        Et(
          l,
          t,
          a,
          u
        );
    }
  }
  function ru(l, t, a, u, e) {
    for (e = e && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null; ) {
      var n = l, i = t, c = a, s = u, r = i.flags;
      switch (i.tag) {
        case 0:
        case 11:
        case 15:
          ru(
            n,
            i,
            c,
            s,
            e
          ), ne(8, i);
          break;
        case 23:
          break;
        case 22:
          var z = i.stateNode;
          i.memoizedState !== null ? z._visibility & 2 ? ru(
            n,
            i,
            c,
            s,
            e
          ) : ce(
            n,
            i
          ) : (z._visibility |= 2, ru(
            n,
            i,
            c,
            s,
            e
          )), e && r & 2048 && Rc(
            i.alternate,
            i
          );
          break;
        case 24:
          ru(
            n,
            i,
            c,
            s,
            e
          ), e && r & 2048 && xc(i.alternate, i);
          break;
        default:
          ru(
            n,
            i,
            c,
            s,
            e
          );
      }
      t = t.sibling;
    }
  }
  function ce(l, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = l, u = t, e = u.flags;
        switch (u.tag) {
          case 22:
            ce(a, u), e & 2048 && Rc(
              u.alternate,
              u
            );
            break;
          case 24:
            ce(a, u), e & 2048 && xc(u.alternate, u);
            break;
          default:
            ce(a, u);
        }
        t = t.sibling;
      }
  }
  var fe = 8192;
  function gu(l, t, a) {
    if (l.subtreeFlags & fe)
      for (l = l.child; l !== null; )
        E0(
          l,
          t,
          a
        ), l = l.sibling;
  }
  function E0(l, t, a) {
    switch (l.tag) {
      case 26:
        gu(
          l,
          t,
          a
        ), l.flags & fe && l.memoizedState !== null && sv(
          a,
          zt,
          l.memoizedState,
          l.memoizedProps
        );
        break;
      case 5:
        gu(
          l,
          t,
          a
        );
        break;
      case 3:
      case 4:
        var u = zt;
        zt = Cn(l.stateNode.containerInfo), gu(
          l,
          t,
          a
        ), zt = u;
        break;
      case 22:
        l.memoizedState === null && (u = l.alternate, u !== null && u.memoizedState !== null ? (u = fe, fe = 16777216, gu(
          l,
          t,
          a
        ), fe = u) : gu(
          l,
          t,
          a
        ));
        break;
      default:
        gu(
          l,
          t,
          a
        );
    }
  }
  function T0(l) {
    var t = l.alternate;
    if (t !== null && (l = t.child, l !== null)) {
      t.child = null;
      do
        t = l.sibling, l.sibling = null, l = t;
      while (l !== null);
    }
  }
  function se(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          Ul = u, A0(
            u,
            l
          );
        }
      T0(l);
    }
    if (l.subtreeFlags & 10256)
      for (l = l.child; l !== null; )
        p0(l), l = l.sibling;
  }
  function p0(l) {
    switch (l.tag) {
      case 0:
      case 11:
      case 15:
        se(l), l.flags & 2048 && fa(9, l, l.return);
        break;
      case 3:
        se(l);
        break;
      case 12:
        se(l);
        break;
      case 22:
        var t = l.stateNode;
        l.memoizedState !== null && t._visibility & 2 && (l.return === null || l.return.tag !== 13) ? (t._visibility &= -3, bn(l)) : se(l);
        break;
      default:
        se(l);
    }
  }
  function bn(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          Ul = u, A0(
            u,
            l
          );
        }
      T0(l);
    }
    for (l = l.child; l !== null; ) {
      switch (t = l, t.tag) {
        case 0:
        case 11:
        case 15:
          fa(8, t, t.return), bn(t);
          break;
        case 22:
          a = t.stateNode, a._visibility & 2 && (a._visibility &= -3, bn(t));
          break;
        default:
          bn(t);
      }
      l = l.sibling;
    }
  }
  function A0(l, t) {
    for (; Ul !== null; ) {
      var a = Ul;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          fa(8, a, t);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var u = a.memoizedState.cachePool.pool;
            u != null && u.refCount++;
          }
          break;
        case 24:
          Ju(a.memoizedState.cache);
      }
      if (u = a.child, u !== null) u.return = a, Ul = u;
      else
        l: for (a = l; Ul !== null; ) {
          u = Ul;
          var e = u.sibling, n = u.return;
          if (v0(u), u === a) {
            Ul = null;
            break l;
          }
          if (e !== null) {
            e.return = n, Ul = e;
            break l;
          }
          Ul = n;
        }
    }
  }
  var Am = {
    getCacheForType: function(l) {
      var t = Rl(El), a = t.data.get(l);
      return a === void 0 && (a = l(), t.data.set(l, a)), a;
    },
    cacheSignal: function() {
      return Rl(El).controller.signal;
    }
  }, _m = typeof WeakMap == "function" ? WeakMap : Map, ll = 0, ol = null, J = null, $ = 0, al = 0, et = null, sa = !1, Su = !1, qc = !1, Kt = 0, rl = 0, oa = 0, Qa = 0, Bc = 0, nt = 0, bu = 0, oe = null, Wl = null, Yc = !1, zn = 0, _0 = 0, En = 1 / 0, Tn = null, da = null, Ol = 0, ya = null, zu = null, Jt = 0, jc = 0, Gc = null, O0 = null, de = 0, Xc = null;
  function it() {
    return (ll & 2) !== 0 && $ !== 0 ? $ & -$ : E.T !== null ? Jc() : Qf();
  }
  function M0() {
    if (nt === 0)
      if (($ & 536870912) === 0 || F) {
        var l = Ue;
        Ue <<= 1, (Ue & 3932160) === 0 && (Ue = 262144), nt = l;
      } else nt = 536870912;
    return l = at.current, l !== null && (l.flags |= 32), nt;
  }
  function kl(l, t, a) {
    (l === ol && (al === 2 || al === 9) || l.cancelPendingCommit !== null) && (Eu(l, 0), ma(
      l,
      $,
      nt,
      !1
    )), Cu(l, a), ((ll & 2) === 0 || l !== ol) && (l === ol && ((ll & 2) === 0 && (Qa |= a), rl === 4 && ma(
      l,
      $,
      nt,
      !1
    )), Dt(l));
  }
  function D0(l, t, a) {
    if ((ll & 6) !== 0) throw Error(f(327));
    var u = !a && (t & 127) === 0 && (t & l.expiredLanes) === 0 || Hu(l, t), e = u ? Dm(l, t) : Zc(l, t, !0), n = u;
    do {
      if (e === 0) {
        Su && !u && ma(l, t, 0, !1);
        break;
      } else {
        if (a = l.current.alternate, n && !Om(a)) {
          e = Zc(l, t, !1), n = !1;
          continue;
        }
        if (e === 2) {
          if (n = t, l.errorRecoveryDisabledLanes & n)
            var i = 0;
          else
            i = l.pendingLanes & -536870913, i = i !== 0 ? i : i & 536870912 ? 536870912 : 0;
          if (i !== 0) {
            t = i;
            l: {
              var c = l;
              e = oe;
              var s = c.current.memoizedState.isDehydrated;
              if (s && (Eu(c, i).flags |= 256), i = Zc(
                c,
                i,
                !1
              ), i !== 2) {
                if (qc && !s) {
                  c.errorRecoveryDisabledLanes |= n, Qa |= n, e = 4;
                  break l;
                }
                n = Wl, Wl = e, n !== null && (Wl === null ? Wl = n : Wl.push.apply(
                  Wl,
                  n
                ));
              }
              e = i;
            }
            if (n = !1, e !== 2) continue;
          }
        }
        if (e === 1) {
          Eu(l, 0), ma(l, t, 0, !0);
          break;
        }
        l: {
          switch (u = l, n = e, n) {
            case 0:
            case 1:
              throw Error(f(345));
            case 4:
              if ((t & 4194048) !== t) break;
            case 6:
              ma(
                u,
                t,
                nt,
                !sa
              );
              break l;
            case 2:
              Wl = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(f(329));
          }
          if ((t & 62914560) === t && (e = zn + 300 - Fl(), 10 < e)) {
            if (ma(
              u,
              t,
              nt,
              !sa
            ), He(u, 0, !0) !== 0) break l;
            Jt = t, u.timeoutHandle = nd(
              U0.bind(
                null,
                u,
                a,
                Wl,
                Tn,
                Yc,
                t,
                nt,
                Qa,
                bu,
                sa,
                n,
                "Throttled",
                -0,
                0
              ),
              e
            );
            break l;
          }
          U0(
            u,
            a,
            Wl,
            Tn,
            Yc,
            t,
            nt,
            Qa,
            bu,
            sa,
            n,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    Dt(l);
  }
  function U0(l, t, a, u, e, n, i, c, s, r, z, A, g, b) {
    if (l.timeoutHandle = -1, A = t.subtreeFlags, A & 8192 || (A & 16785408) === 16785408) {
      A = {
        stylesheets: null,
        count: 0,
        imgCount: 0,
        imgBytes: 0,
        suspenseyImages: [],
        waitingForImages: !0,
        waitingForViewTransition: !1,
        unsuspend: Ht
      }, E0(
        t,
        n,
        A
      );
      var N = (n & 62914560) === n ? zn - Fl() : (n & 4194048) === n ? _0 - Fl() : 0;
      if (N = ov(
        A,
        N
      ), N !== null) {
        Jt = n, l.cancelPendingCommit = N(
          Y0.bind(
            null,
            l,
            t,
            n,
            a,
            u,
            e,
            i,
            c,
            s,
            z,
            A,
            null,
            g,
            b
          )
        ), ma(l, n, i, !r);
        return;
      }
    }
    Y0(
      l,
      t,
      n,
      a,
      u,
      e,
      i,
      c,
      s
    );
  }
  function Om(l) {
    for (var t = l; ; ) {
      var a = t.tag;
      if ((a === 0 || a === 11 || a === 15) && t.flags & 16384 && (a = t.updateQueue, a !== null && (a = a.stores, a !== null)))
        for (var u = 0; u < a.length; u++) {
          var e = a[u], n = e.getSnapshot;
          e = e.value;
          try {
            if (!lt(n(), e)) return !1;
          } catch {
            return !1;
          }
        }
      if (a = t.child, t.subtreeFlags & 16384 && a !== null)
        a.return = t, t = a;
      else {
        if (t === l) break;
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === l) return !0;
          t = t.return;
        }
        t.sibling.return = t.return, t = t.sibling;
      }
    }
    return !0;
  }
  function ma(l, t, a, u) {
    t &= ~Bc, t &= ~Qa, l.suspendedLanes |= t, l.pingedLanes &= ~t, u && (l.warmLanes |= t), u = l.expirationTimes;
    for (var e = t; 0 < e; ) {
      var n = 31 - Pl(e), i = 1 << n;
      u[n] = -1, e &= ~i;
    }
    a !== 0 && jf(l, a, t);
  }
  function pn() {
    return (ll & 6) === 0 ? (ye(0), !1) : !0;
  }
  function Qc() {
    if (J !== null) {
      if (al === 0)
        var l = J.return;
      else
        l = J, qt = Ca = null, uc(l), du = null, $u = 0, l = J;
      for (; l !== null; )
        i0(l.alternate, l), l = l.return;
      J = null;
    }
  }
  function Eu(l, t) {
    var a = l.timeoutHandle;
    a !== -1 && (l.timeoutHandle = -1, Jm(a)), a = l.cancelPendingCommit, a !== null && (l.cancelPendingCommit = null, a()), Jt = 0, Qc(), ol = l, J = a = Rt(l.current, null), $ = t, al = 0, et = null, sa = !1, Su = Hu(l, t), qc = !1, bu = nt = Bc = Qa = oa = rl = 0, Wl = oe = null, Yc = !1, (t & 8) !== 0 && (t |= t & 32);
    var u = l.entangledLanes;
    if (u !== 0)
      for (l = l.entanglements, u &= t; 0 < u; ) {
        var e = 31 - Pl(u), n = 1 << e;
        t |= l[e], u &= ~n;
      }
    return Kt = t, Le(), a;
  }
  function N0(l, t) {
    Z = null, E.H = ae, t === ou || t === Fe ? (t = Ks(), al = 3) : t === Ki ? (t = Ks(), al = 4) : al = t === bc ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, et = t, J === null && (rl = 1, yn(
      l,
      dt(t, l.current)
    ));
  }
  function H0() {
    var l = at.current;
    return l === null ? !0 : ($ & 4194048) === $ ? ht === null : ($ & 62914560) === $ || ($ & 536870912) !== 0 ? l === ht : !1;
  }
  function C0() {
    var l = E.H;
    return E.H = ae, l === null ? ae : l;
  }
  function R0() {
    var l = E.A;
    return E.A = Am, l;
  }
  function An() {
    rl = 4, sa || ($ & 4194048) !== $ && at.current !== null || (Su = !0), (oa & 134217727) === 0 && (Qa & 134217727) === 0 || ol === null || ma(
      ol,
      $,
      nt,
      !1
    );
  }
  function Zc(l, t, a) {
    var u = ll;
    ll |= 2;
    var e = C0(), n = R0();
    (ol !== l || $ !== t) && (Tn = null, Eu(l, t)), t = !1;
    var i = rl;
    l: do
      try {
        if (al !== 0 && J !== null) {
          var c = J, s = et;
          switch (al) {
            case 8:
              Qc(), i = 6;
              break l;
            case 3:
            case 2:
            case 9:
            case 6:
              at.current === null && (t = !0);
              var r = al;
              if (al = 0, et = null, Tu(l, c, s, r), a && Su) {
                i = 0;
                break l;
              }
              break;
            default:
              r = al, al = 0, et = null, Tu(l, c, s, r);
          }
        }
        Mm(), i = rl;
        break;
      } catch (z) {
        N0(l, z);
      }
    while (!0);
    return t && l.shellSuspendCounter++, qt = Ca = null, ll = u, E.H = e, E.A = n, J === null && (ol = null, $ = 0, Le()), i;
  }
  function Mm() {
    for (; J !== null; ) x0(J);
  }
  function Dm(l, t) {
    var a = ll;
    ll |= 2;
    var u = C0(), e = R0();
    ol !== l || $ !== t ? (Tn = null, En = Fl() + 500, Eu(l, t)) : Su = Hu(
      l,
      t
    );
    l: do
      try {
        if (al !== 0 && J !== null) {
          t = J;
          var n = et;
          t: switch (al) {
            case 1:
              al = 0, et = null, Tu(l, t, n, 1);
              break;
            case 2:
            case 9:
              if (Ls(n)) {
                al = 0, et = null, q0(t);
                break;
              }
              t = function() {
                al !== 2 && al !== 9 || ol !== l || (al = 7), Dt(l);
              }, n.then(t, t);
              break l;
            case 3:
              al = 7;
              break l;
            case 4:
              al = 5;
              break l;
            case 7:
              Ls(n) ? (al = 0, et = null, q0(t)) : (al = 0, et = null, Tu(l, t, n, 7));
              break;
            case 5:
              var i = null;
              switch (J.tag) {
                case 26:
                  i = J.memoizedState;
                case 5:
                case 27:
                  var c = J;
                  if (i ? zd(i) : c.stateNode.complete) {
                    al = 0, et = null;
                    var s = c.sibling;
                    if (s !== null) J = s;
                    else {
                      var r = c.return;
                      r !== null ? (J = r, _n(r)) : J = null;
                    }
                    break t;
                  }
              }
              al = 0, et = null, Tu(l, t, n, 5);
              break;
            case 6:
              al = 0, et = null, Tu(l, t, n, 6);
              break;
            case 8:
              Qc(), rl = 6;
              break l;
            default:
              throw Error(f(462));
          }
        }
        Um();
        break;
      } catch (z) {
        N0(l, z);
      }
    while (!0);
    return qt = Ca = null, E.H = u, E.A = e, ll = a, J !== null ? 0 : (ol = null, $ = 0, Le(), rl);
  }
  function Um() {
    for (; J !== null && !Id(); )
      x0(J);
  }
  function x0(l) {
    var t = e0(l.alternate, l, Kt);
    l.memoizedProps = l.pendingProps, t === null ? _n(l) : J = t;
  }
  function q0(l) {
    var t = l, a = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = Io(
          a,
          t,
          t.pendingProps,
          t.type,
          void 0,
          $
        );
        break;
      case 11:
        t = Io(
          a,
          t,
          t.pendingProps,
          t.type.render,
          t.ref,
          $
        );
        break;
      case 5:
        uc(t);
      default:
        i0(a, t), t = J = Cs(t, Kt), t = e0(a, t, Kt);
    }
    l.memoizedProps = l.pendingProps, t === null ? _n(l) : J = t;
  }
  function Tu(l, t, a, u) {
    qt = Ca = null, uc(t), du = null, $u = 0;
    var e = t.return;
    try {
      if (gm(
        l,
        e,
        t,
        a,
        $
      )) {
        rl = 1, yn(
          l,
          dt(a, l.current)
        ), J = null;
        return;
      }
    } catch (n) {
      if (e !== null) throw J = e, n;
      rl = 1, yn(
        l,
        dt(a, l.current)
      ), J = null;
      return;
    }
    t.flags & 32768 ? (F || u === 1 ? l = !0 : Su || ($ & 536870912) !== 0 ? l = !1 : (sa = l = !0, (u === 2 || u === 9 || u === 3 || u === 6) && (u = at.current, u !== null && u.tag === 13 && (u.flags |= 16384))), B0(t, l)) : _n(t);
  }
  function _n(l) {
    var t = l;
    do {
      if ((t.flags & 32768) !== 0) {
        B0(
          t,
          sa
        );
        return;
      }
      l = t.return;
      var a = zm(
        t.alternate,
        t,
        Kt
      );
      if (a !== null) {
        J = a;
        return;
      }
      if (t = t.sibling, t !== null) {
        J = t;
        return;
      }
      J = t = l;
    } while (t !== null);
    rl === 0 && (rl = 5);
  }
  function B0(l, t) {
    do {
      var a = Em(l.alternate, l);
      if (a !== null) {
        a.flags &= 32767, J = a;
        return;
      }
      if (a = l.return, a !== null && (a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null), !t && (l = l.sibling, l !== null)) {
        J = l;
        return;
      }
      J = l = a;
    } while (l !== null);
    rl = 6, J = null;
  }
  function Y0(l, t, a, u, e, n, i, c, s) {
    l.cancelPendingCommit = null;
    do
      On();
    while (Ol !== 0);
    if ((ll & 6) !== 0) throw Error(f(327));
    if (t !== null) {
      if (t === l.current) throw Error(f(177));
      if (n = t.lanes | t.childLanes, n |= Ni, fy(
        l,
        a,
        n,
        i,
        c,
        s
      ), l === ol && (J = ol = null, $ = 0), zu = t, ya = l, Jt = a, jc = n, Gc = e, O0 = u, (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? (l.callbackNode = null, l.callbackPriority = 0, Rm(Me, function() {
        return Z0(), null;
      })) : (l.callbackNode = null, l.callbackPriority = 0), u = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || u) {
        u = E.T, E.T = null, e = M.p, M.p = 2, i = ll, ll |= 4;
        try {
          Tm(l, t, a);
        } finally {
          ll = i, M.p = e, E.T = u;
        }
      }
      Ol = 1, j0(), G0(), X0();
    }
  }
  function j0() {
    if (Ol === 1) {
      Ol = 0;
      var l = ya, t = zu, a = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || a) {
        a = E.T, E.T = null;
        var u = M.p;
        M.p = 2;
        var e = ll;
        ll |= 4;
        try {
          S0(t, l);
          var n = lf, i = ps(l.containerInfo), c = n.focusedElem, s = n.selectionRange;
          if (i !== c && c && c.ownerDocument && Ts(
            c.ownerDocument.documentElement,
            c
          )) {
            if (s !== null && _i(c)) {
              var r = s.start, z = s.end;
              if (z === void 0 && (z = r), "selectionStart" in c)
                c.selectionStart = r, c.selectionEnd = Math.min(
                  z,
                  c.value.length
                );
              else {
                var A = c.ownerDocument || document, g = A && A.defaultView || window;
                if (g.getSelection) {
                  var b = g.getSelection(), N = c.textContent.length, B = Math.min(s.start, N), cl = s.end === void 0 ? B : Math.min(s.end, N);
                  !b.extend && B > cl && (i = cl, cl = B, B = i);
                  var m = Es(
                    c,
                    B
                  ), d = Es(
                    c,
                    cl
                  );
                  if (m && d && (b.rangeCount !== 1 || b.anchorNode !== m.node || b.anchorOffset !== m.offset || b.focusNode !== d.node || b.focusOffset !== d.offset)) {
                    var h = A.createRange();
                    h.setStart(m.node, m.offset), b.removeAllRanges(), B > cl ? (b.addRange(h), b.extend(d.node, d.offset)) : (h.setEnd(d.node, d.offset), b.addRange(h));
                  }
                }
              }
            }
            for (A = [], b = c; b = b.parentNode; )
              b.nodeType === 1 && A.push({
                element: b,
                left: b.scrollLeft,
                top: b.scrollTop
              });
            for (typeof c.focus == "function" && c.focus(), c = 0; c < A.length; c++) {
              var T = A[c];
              T.element.scrollLeft = T.left, T.element.scrollTop = T.top;
            }
          }
          jn = !!Pc, lf = Pc = null;
        } finally {
          ll = e, M.p = u, E.T = a;
        }
      }
      l.current = t, Ol = 2;
    }
  }
  function G0() {
    if (Ol === 2) {
      Ol = 0;
      var l = ya, t = zu, a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        a = E.T, E.T = null;
        var u = M.p;
        M.p = 2;
        var e = ll;
        ll |= 4;
        try {
          m0(l, t.alternate, t);
        } finally {
          ll = e, M.p = u, E.T = a;
        }
      }
      Ol = 3;
    }
  }
  function X0() {
    if (Ol === 4 || Ol === 3) {
      Ol = 0, Pd();
      var l = ya, t = zu, a = Jt, u = O0;
      (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? Ol = 5 : (Ol = 0, zu = ya = null, Q0(l, l.pendingLanes));
      var e = l.pendingLanes;
      if (e === 0 && (da = null), ii(a), t = t.stateNode, Il && typeof Il.onCommitFiberRoot == "function")
        try {
          Il.onCommitFiberRoot(
            Nu,
            t,
            void 0,
            (t.current.flags & 128) === 128
          );
        } catch {
        }
      if (u !== null) {
        t = E.T, e = M.p, M.p = 2, E.T = null;
        try {
          for (var n = l.onRecoverableError, i = 0; i < u.length; i++) {
            var c = u[i];
            n(c.value, {
              componentStack: c.stack
            });
          }
        } finally {
          E.T = t, M.p = e;
        }
      }
      (Jt & 3) !== 0 && On(), Dt(l), e = l.pendingLanes, (a & 261930) !== 0 && (e & 42) !== 0 ? l === Xc ? de++ : (de = 0, Xc = l) : de = 0, ye(0);
    }
  }
  function Q0(l, t) {
    (l.pooledCacheLanes &= t) === 0 && (t = l.pooledCache, t != null && (l.pooledCache = null, Ju(t)));
  }
  function On() {
    return j0(), G0(), X0(), Z0();
  }
  function Z0() {
    if (Ol !== 5) return !1;
    var l = ya, t = jc;
    jc = 0;
    var a = ii(Jt), u = E.T, e = M.p;
    try {
      M.p = 32 > a ? 32 : a, E.T = null, a = Gc, Gc = null;
      var n = ya, i = Jt;
      if (Ol = 0, zu = ya = null, Jt = 0, (ll & 6) !== 0) throw Error(f(331));
      var c = ll;
      if (ll |= 4, p0(n.current), z0(
        n,
        n.current,
        i,
        a
      ), ll = c, ye(0, !1), Il && typeof Il.onPostCommitFiberRoot == "function")
        try {
          Il.onPostCommitFiberRoot(Nu, n);
        } catch {
        }
      return !0;
    } finally {
      M.p = e, E.T = u, Q0(l, t);
    }
  }
  function L0(l, t, a) {
    t = dt(a, t), t = Sc(l.stateNode, t, 2), l = na(l, t, 2), l !== null && (Cu(l, 2), Dt(l));
  }
  function ul(l, t, a) {
    if (l.tag === 3)
      L0(l, l, a);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          L0(
            t,
            l,
            a
          );
          break;
        } else if (t.tag === 1) {
          var u = t.stateNode;
          if (typeof t.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (da === null || !da.has(u))) {
            l = dt(a, l), a = Vo(2), u = na(t, a, 2), u !== null && (Ko(
              a,
              u,
              t,
              l
            ), Cu(u, 2), Dt(u));
            break;
          }
        }
        t = t.return;
      }
  }
  function Lc(l, t, a) {
    var u = l.pingCache;
    if (u === null) {
      u = l.pingCache = new _m();
      var e = /* @__PURE__ */ new Set();
      u.set(t, e);
    } else
      e = u.get(t), e === void 0 && (e = /* @__PURE__ */ new Set(), u.set(t, e));
    e.has(a) || (qc = !0, e.add(a), l = Nm.bind(null, l, t, a), t.then(l, l));
  }
  function Nm(l, t, a) {
    var u = l.pingCache;
    u !== null && u.delete(t), l.pingedLanes |= l.suspendedLanes & a, l.warmLanes &= ~a, ol === l && ($ & a) === a && (rl === 4 || rl === 3 && ($ & 62914560) === $ && 300 > Fl() - zn ? (ll & 2) === 0 && Eu(l, 0) : Bc |= a, bu === $ && (bu = 0)), Dt(l);
  }
  function V0(l, t) {
    t === 0 && (t = Yf()), l = Ua(l, t), l !== null && (Cu(l, t), Dt(l));
  }
  function Hm(l) {
    var t = l.memoizedState, a = 0;
    t !== null && (a = t.retryLane), V0(l, a);
  }
  function Cm(l, t) {
    var a = 0;
    switch (l.tag) {
      case 31:
      case 13:
        var u = l.stateNode, e = l.memoizedState;
        e !== null && (a = e.retryLane);
        break;
      case 19:
        u = l.stateNode;
        break;
      case 22:
        u = l.stateNode._retryCache;
        break;
      default:
        throw Error(f(314));
    }
    u !== null && u.delete(t), V0(l, a);
  }
  function Rm(l, t) {
    return ai(l, t);
  }
  var Mn = null, pu = null, Vc = !1, Dn = !1, Kc = !1, va = 0;
  function Dt(l) {
    l !== pu && l.next === null && (pu === null ? Mn = pu = l : pu = pu.next = l), Dn = !0, Vc || (Vc = !0, qm());
  }
  function ye(l, t) {
    if (!Kc && Dn) {
      Kc = !0;
      do
        for (var a = !1, u = Mn; u !== null; ) {
          if (l !== 0) {
            var e = u.pendingLanes;
            if (e === 0) var n = 0;
            else {
              var i = u.suspendedLanes, c = u.pingedLanes;
              n = (1 << 31 - Pl(42 | l) + 1) - 1, n &= e & ~(i & ~c), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (a = !0, $0(u, n));
          } else
            n = $, n = He(
              u,
              u === ol ? n : 0,
              u.cancelPendingCommit !== null || u.timeoutHandle !== -1
            ), (n & 3) === 0 || Hu(u, n) || (a = !0, $0(u, n));
          u = u.next;
        }
      while (a);
      Kc = !1;
    }
  }
  function xm() {
    K0();
  }
  function K0() {
    Dn = Vc = !1;
    var l = 0;
    va !== 0 && Km() && (l = va);
    for (var t = Fl(), a = null, u = Mn; u !== null; ) {
      var e = u.next, n = J0(u, t);
      n === 0 ? (u.next = null, a === null ? Mn = e : a.next = e, e === null && (pu = a)) : (a = u, (l !== 0 || (n & 3) !== 0) && (Dn = !0)), u = e;
    }
    Ol !== 0 && Ol !== 5 || ye(l), va !== 0 && (va = 0);
  }
  function J0(l, t) {
    for (var a = l.suspendedLanes, u = l.pingedLanes, e = l.expirationTimes, n = l.pendingLanes & -62914561; 0 < n; ) {
      var i = 31 - Pl(n), c = 1 << i, s = e[i];
      s === -1 ? ((c & a) === 0 || (c & u) !== 0) && (e[i] = cy(c, t)) : s <= t && (l.expiredLanes |= c), n &= ~c;
    }
    if (t = ol, a = $, a = He(
      l,
      l === t ? a : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u = l.callbackNode, a === 0 || l === t && (al === 2 || al === 9) || l.cancelPendingCommit !== null)
      return u !== null && u !== null && ui(u), l.callbackNode = null, l.callbackPriority = 0;
    if ((a & 3) === 0 || Hu(l, a)) {
      if (t = a & -a, t === l.callbackPriority) return t;
      switch (u !== null && ui(u), ii(a)) {
        case 2:
        case 8:
          a = qf;
          break;
        case 32:
          a = Me;
          break;
        case 268435456:
          a = Bf;
          break;
        default:
          a = Me;
      }
      return u = w0.bind(null, l), a = ai(a, u), l.callbackPriority = t, l.callbackNode = a, t;
    }
    return u !== null && u !== null && ui(u), l.callbackPriority = 2, l.callbackNode = null, 2;
  }
  function w0(l, t) {
    if (Ol !== 0 && Ol !== 5)
      return l.callbackNode = null, l.callbackPriority = 0, null;
    var a = l.callbackNode;
    if (On() && l.callbackNode !== a)
      return null;
    var u = $;
    return u = He(
      l,
      l === ol ? u : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u === 0 ? null : (D0(l, u, t), J0(l, Fl()), l.callbackNode != null && l.callbackNode === a ? w0.bind(null, l) : null);
  }
  function $0(l, t) {
    if (On()) return null;
    D0(l, t, !0);
  }
  function qm() {
    wm(function() {
      (ll & 6) !== 0 ? ai(
        xf,
        xm
      ) : K0();
    });
  }
  function Jc() {
    if (va === 0) {
      var l = fu;
      l === 0 && (l = De, De <<= 1, (De & 261888) === 0 && (De = 256)), va = l;
    }
    return va;
  }
  function W0(l) {
    return l == null || typeof l == "symbol" || typeof l == "boolean" ? null : typeof l == "function" ? l : qe("" + l);
  }
  function k0(l, t) {
    var a = t.ownerDocument.createElement("input");
    return a.name = t.name, a.value = t.value, l.id && a.setAttribute("form", l.id), t.parentNode.insertBefore(a, t), l = new FormData(l), a.parentNode.removeChild(a), l;
  }
  function Bm(l, t, a, u, e) {
    if (t === "submit" && a && a.stateNode === e) {
      var n = W0(
        (e[Vl] || null).action
      ), i = u.submitter;
      i && (t = (t = i[Vl] || null) ? W0(t.formAction) : i.getAttribute("formAction"), t !== null && (n = t, i = null));
      var c = new Ge(
        "action",
        "action",
        null,
        u,
        e
      );
      l.push({
        event: c,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (u.defaultPrevented) {
                if (va !== 0) {
                  var s = i ? k0(e, i) : new FormData(e);
                  yc(
                    a,
                    {
                      pending: !0,
                      data: s,
                      method: e.method,
                      action: n
                    },
                    null,
                    s
                  );
                }
              } else
                typeof n == "function" && (c.preventDefault(), s = i ? k0(e, i) : new FormData(e), yc(
                  a,
                  {
                    pending: !0,
                    data: s,
                    method: e.method,
                    action: n
                  },
                  n,
                  s
                ));
            },
            currentTarget: e
          }
        ]
      });
    }
  }
  for (var wc = 0; wc < Ui.length; wc++) {
    var $c = Ui[wc], Ym = $c.toLowerCase(), jm = $c[0].toUpperCase() + $c.slice(1);
    bt(
      Ym,
      "on" + jm
    );
  }
  bt(Os, "onAnimationEnd"), bt(Ms, "onAnimationIteration"), bt(Ds, "onAnimationStart"), bt("dblclick", "onDoubleClick"), bt("focusin", "onFocus"), bt("focusout", "onBlur"), bt(lm, "onTransitionRun"), bt(tm, "onTransitionStart"), bt(am, "onTransitionCancel"), bt(Us, "onTransitionEnd"), $a("onMouseEnter", ["mouseout", "mouseover"]), $a("onMouseLeave", ["mouseout", "mouseover"]), $a("onPointerEnter", ["pointerout", "pointerover"]), $a("onPointerLeave", ["pointerout", "pointerover"]), _a(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), _a(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), _a("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), _a(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), _a(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), _a(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var me = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), Gm = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(me)
  );
  function F0(l, t) {
    t = (t & 4) !== 0;
    for (var a = 0; a < l.length; a++) {
      var u = l[a], e = u.event;
      u = u.listeners;
      l: {
        var n = void 0;
        if (t)
          for (var i = u.length - 1; 0 <= i; i--) {
            var c = u[i], s = c.instance, r = c.currentTarget;
            if (c = c.listener, s !== n && e.isPropagationStopped())
              break l;
            n = c, e.currentTarget = r;
            try {
              n(e);
            } catch (z) {
              Ze(z);
            }
            e.currentTarget = null, n = s;
          }
        else
          for (i = 0; i < u.length; i++) {
            if (c = u[i], s = c.instance, r = c.currentTarget, c = c.listener, s !== n && e.isPropagationStopped())
              break l;
            n = c, e.currentTarget = r;
            try {
              n(e);
            } catch (z) {
              Ze(z);
            }
            e.currentTarget = null, n = s;
          }
      }
    }
  }
  function w(l, t) {
    var a = t[ci];
    a === void 0 && (a = t[ci] = /* @__PURE__ */ new Set());
    var u = l + "__bubble";
    a.has(u) || (I0(t, l, 2, !1), a.add(u));
  }
  function Wc(l, t, a) {
    var u = 0;
    t && (u |= 4), I0(
      a,
      l,
      u,
      t
    );
  }
  var Un = "_reactListening" + Math.random().toString(36).slice(2);
  function kc(l) {
    if (!l[Un]) {
      l[Un] = !0, Vf.forEach(function(a) {
        a !== "selectionchange" && (Gm.has(a) || Wc(a, !1, l), Wc(a, !0, l));
      });
      var t = l.nodeType === 9 ? l : l.ownerDocument;
      t === null || t[Un] || (t[Un] = !0, Wc("selectionchange", !1, t));
    }
  }
  function I0(l, t, a, u) {
    switch (Md(t)) {
      case 2:
        var e = mv;
        break;
      case 8:
        e = vv;
        break;
      default:
        e = yf;
    }
    a = e.bind(
      null,
      t,
      a,
      l
    ), e = void 0, !ri || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (e = !0), u ? e !== void 0 ? l.addEventListener(t, a, {
      capture: !0,
      passive: e
    }) : l.addEventListener(t, a, !0) : e !== void 0 ? l.addEventListener(t, a, {
      passive: e
    }) : l.addEventListener(t, a, !1);
  }
  function Fc(l, t, a, u, e) {
    var n = u;
    if ((t & 1) === 0 && (t & 2) === 0 && u !== null)
      l: for (; ; ) {
        if (u === null) return;
        var i = u.tag;
        if (i === 3 || i === 4) {
          var c = u.stateNode.containerInfo;
          if (c === e) break;
          if (i === 4)
            for (i = u.return; i !== null; ) {
              var s = i.tag;
              if ((s === 3 || s === 4) && i.stateNode.containerInfo === e)
                return;
              i = i.return;
            }
          for (; c !== null; ) {
            if (i = Ka(c), i === null) return;
            if (s = i.tag, s === 5 || s === 6 || s === 26 || s === 27) {
              u = n = i;
              continue l;
            }
            c = c.parentNode;
          }
        }
        u = u.return;
      }
    as(function() {
      var r = n, z = vi(a), A = [];
      l: {
        var g = Ns.get(l);
        if (g !== void 0) {
          var b = Ge, N = l;
          switch (l) {
            case "keypress":
              if (Ye(a) === 0) break l;
            case "keydown":
            case "keyup":
              b = Cy;
              break;
            case "focusin":
              N = "focus", b = zi;
              break;
            case "focusout":
              N = "blur", b = zi;
              break;
            case "beforeblur":
            case "afterblur":
              b = zi;
              break;
            case "click":
              if (a.button === 2) break l;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              b = ns;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              b = zy;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              b = qy;
              break;
            case Os:
            case Ms:
            case Ds:
              b = py;
              break;
            case Us:
              b = Yy;
              break;
            case "scroll":
            case "scrollend":
              b = Sy;
              break;
            case "wheel":
              b = Gy;
              break;
            case "copy":
            case "cut":
            case "paste":
              b = _y;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              b = cs;
              break;
            case "toggle":
            case "beforetoggle":
              b = Qy;
          }
          var B = (t & 4) !== 0, cl = !B && (l === "scroll" || l === "scrollend"), m = B ? g !== null ? g + "Capture" : null : g;
          B = [];
          for (var d = r, h; d !== null; ) {
            var T = d;
            if (h = T.stateNode, T = T.tag, T !== 5 && T !== 26 && T !== 27 || h === null || m === null || (T = qu(d, m), T != null && B.push(
              ve(d, T, h)
            )), cl) break;
            d = d.return;
          }
          0 < B.length && (g = new b(
            g,
            N,
            null,
            a,
            z
          ), A.push({ event: g, listeners: B }));
        }
      }
      if ((t & 7) === 0) {
        l: {
          if (g = l === "mouseover" || l === "pointerover", b = l === "mouseout" || l === "pointerout", g && a !== mi && (N = a.relatedTarget || a.fromElement) && (Ka(N) || N[Va]))
            break l;
          if ((b || g) && (g = z.window === z ? z : (g = z.ownerDocument) ? g.defaultView || g.parentWindow : window, b ? (N = a.relatedTarget || a.toElement, b = r, N = N ? Ka(N) : null, N !== null && (cl = X(N), B = N.tag, N !== cl || B !== 5 && B !== 27 && B !== 6) && (N = null)) : (b = null, N = r), b !== N)) {
            if (B = ns, T = "onMouseLeave", m = "onMouseEnter", d = "mouse", (l === "pointerout" || l === "pointerover") && (B = cs, T = "onPointerLeave", m = "onPointerEnter", d = "pointer"), cl = b == null ? g : xu(b), h = N == null ? g : xu(N), g = new B(
              T,
              d + "leave",
              b,
              a,
              z
            ), g.target = cl, g.relatedTarget = h, T = null, Ka(z) === r && (B = new B(
              m,
              d + "enter",
              N,
              a,
              z
            ), B.target = h, B.relatedTarget = cl, T = B), cl = T, b && N)
              t: {
                for (B = Xm, m = b, d = N, h = 0, T = m; T; T = B(T))
                  h++;
                T = 0;
                for (var x = d; x; x = B(x))
                  T++;
                for (; 0 < h - T; )
                  m = B(m), h--;
                for (; 0 < T - h; )
                  d = B(d), T--;
                for (; h--; ) {
                  if (m === d || d !== null && m === d.alternate) {
                    B = m;
                    break t;
                  }
                  m = B(m), d = B(d);
                }
                B = null;
              }
            else B = null;
            b !== null && P0(
              A,
              g,
              b,
              B,
              !1
            ), N !== null && cl !== null && P0(
              A,
              cl,
              N,
              B,
              !0
            );
          }
        }
        l: {
          if (g = r ? xu(r) : window, b = g.nodeName && g.nodeName.toLowerCase(), b === "select" || b === "input" && g.type === "file")
            var I = hs;
          else if (ms(g))
            if (rs)
              I = Fy;
            else {
              I = Wy;
              var C = $y;
            }
          else
            b = g.nodeName, !b || b.toLowerCase() !== "input" || g.type !== "checkbox" && g.type !== "radio" ? r && yi(r.elementType) && (I = hs) : I = ky;
          if (I && (I = I(l, r))) {
            vs(
              A,
              I,
              a,
              z
            );
            break l;
          }
          C && C(l, g, r), l === "focusout" && r && g.type === "number" && r.memoizedProps.value != null && di(g, "number", g.value);
        }
        switch (C = r ? xu(r) : window, l) {
          case "focusin":
            (ms(C) || C.contentEditable === "true") && (lu = C, Oi = r, Lu = null);
            break;
          case "focusout":
            Lu = Oi = lu = null;
            break;
          case "mousedown":
            Mi = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Mi = !1, As(A, a, z);
            break;
          case "selectionchange":
            if (Py) break;
          case "keydown":
          case "keyup":
            As(A, a, z);
        }
        var L;
        if (Ti)
          l: {
            switch (l) {
              case "compositionstart":
                var W = "onCompositionStart";
                break l;
              case "compositionend":
                W = "onCompositionEnd";
                break l;
              case "compositionupdate":
                W = "onCompositionUpdate";
                break l;
            }
            W = void 0;
          }
        else
          Pa ? ds(l, a) && (W = "onCompositionEnd") : l === "keydown" && a.keyCode === 229 && (W = "onCompositionStart");
        W && (fs && a.locale !== "ko" && (Pa || W !== "onCompositionStart" ? W === "onCompositionEnd" && Pa && (L = us()) : (It = z, gi = "value" in It ? It.value : It.textContent, Pa = !0)), C = Nn(r, W), 0 < C.length && (W = new is(
          W,
          l,
          null,
          a,
          z
        ), A.push({ event: W, listeners: C }), L ? W.data = L : (L = ys(a), L !== null && (W.data = L)))), (L = Ly ? Vy(l, a) : Ky(l, a)) && (W = Nn(r, "onBeforeInput"), 0 < W.length && (C = new is(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          z
        ), A.push({
          event: C,
          listeners: W
        }), C.data = L)), Bm(
          A,
          l,
          r,
          a,
          z
        );
      }
      F0(A, t);
    });
  }
  function ve(l, t, a) {
    return {
      instance: l,
      listener: t,
      currentTarget: a
    };
  }
  function Nn(l, t) {
    for (var a = t + "Capture", u = []; l !== null; ) {
      var e = l, n = e.stateNode;
      if (e = e.tag, e !== 5 && e !== 26 && e !== 27 || n === null || (e = qu(l, a), e != null && u.unshift(
        ve(l, e, n)
      ), e = qu(l, t), e != null && u.push(
        ve(l, e, n)
      )), l.tag === 3) return u;
      l = l.return;
    }
    return [];
  }
  function Xm(l) {
    if (l === null) return null;
    do
      l = l.return;
    while (l && l.tag !== 5 && l.tag !== 27);
    return l || null;
  }
  function P0(l, t, a, u, e) {
    for (var n = t._reactName, i = []; a !== null && a !== u; ) {
      var c = a, s = c.alternate, r = c.stateNode;
      if (c = c.tag, s !== null && s === u) break;
      c !== 5 && c !== 26 && c !== 27 || r === null || (s = r, e ? (r = qu(a, n), r != null && i.unshift(
        ve(a, r, s)
      )) : e || (r = qu(a, n), r != null && i.push(
        ve(a, r, s)
      ))), a = a.return;
    }
    i.length !== 0 && l.push({ event: t, listeners: i });
  }
  var Qm = /\r\n?/g, Zm = /\u0000|\uFFFD/g;
  function ld(l) {
    return (typeof l == "string" ? l : "" + l).replace(Qm, `
`).replace(Zm, "");
  }
  function td(l, t) {
    return t = ld(t), ld(l) === t;
  }
  function il(l, t, a, u, e, n) {
    switch (a) {
      case "children":
        typeof u == "string" ? t === "body" || t === "textarea" && u === "" || ka(l, u) : (typeof u == "number" || typeof u == "bigint") && t !== "body" && ka(l, "" + u);
        break;
      case "className":
        Re(l, "class", u);
        break;
      case "tabIndex":
        Re(l, "tabindex", u);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        Re(l, a, u);
        break;
      case "style":
        ls(l, u, n);
        break;
      case "data":
        if (t !== "object") {
          Re(l, "data", u);
          break;
        }
      case "src":
      case "href":
        if (u === "" && (t !== "a" || a !== "href")) {
          l.removeAttribute(a);
          break;
        }
        if (u == null || typeof u == "function" || typeof u == "symbol" || typeof u == "boolean") {
          l.removeAttribute(a);
          break;
        }
        u = qe("" + u), l.setAttribute(a, u);
        break;
      case "action":
      case "formAction":
        if (typeof u == "function") {
          l.setAttribute(
            a,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          typeof n == "function" && (a === "formAction" ? (t !== "input" && il(l, t, "name", e.name, e, null), il(
            l,
            t,
            "formEncType",
            e.formEncType,
            e,
            null
          ), il(
            l,
            t,
            "formMethod",
            e.formMethod,
            e,
            null
          ), il(
            l,
            t,
            "formTarget",
            e.formTarget,
            e,
            null
          )) : (il(l, t, "encType", e.encType, e, null), il(l, t, "method", e.method, e, null), il(l, t, "target", e.target, e, null)));
        if (u == null || typeof u == "symbol" || typeof u == "boolean") {
          l.removeAttribute(a);
          break;
        }
        u = qe("" + u), l.setAttribute(a, u);
        break;
      case "onClick":
        u != null && (l.onclick = Ht);
        break;
      case "onScroll":
        u != null && w("scroll", l);
        break;
      case "onScrollEnd":
        u != null && w("scrollend", l);
        break;
      case "dangerouslySetInnerHTML":
        if (u != null) {
          if (typeof u != "object" || !("__html" in u))
            throw Error(f(61));
          if (a = u.__html, a != null) {
            if (e.children != null) throw Error(f(60));
            l.innerHTML = a;
          }
        }
        break;
      case "multiple":
        l.multiple = u && typeof u != "function" && typeof u != "symbol";
        break;
      case "muted":
        l.muted = u && typeof u != "function" && typeof u != "symbol";
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        break;
      case "autoFocus":
        break;
      case "xlinkHref":
        if (u == null || typeof u == "function" || typeof u == "boolean" || typeof u == "symbol") {
          l.removeAttribute("xlink:href");
          break;
        }
        a = qe("" + u), l.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          a
        );
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        u != null && typeof u != "function" && typeof u != "symbol" ? l.setAttribute(a, "" + u) : l.removeAttribute(a);
        break;
      case "inert":
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        u && typeof u != "function" && typeof u != "symbol" ? l.setAttribute(a, "") : l.removeAttribute(a);
        break;
      case "capture":
      case "download":
        u === !0 ? l.setAttribute(a, "") : u !== !1 && u != null && typeof u != "function" && typeof u != "symbol" ? l.setAttribute(a, u) : l.removeAttribute(a);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        u != null && typeof u != "function" && typeof u != "symbol" && !isNaN(u) && 1 <= u ? l.setAttribute(a, u) : l.removeAttribute(a);
        break;
      case "rowSpan":
      case "start":
        u == null || typeof u == "function" || typeof u == "symbol" || isNaN(u) ? l.removeAttribute(a) : l.setAttribute(a, u);
        break;
      case "popover":
        w("beforetoggle", l), w("toggle", l), Ce(l, "popover", u);
        break;
      case "xlinkActuate":
        Nt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          u
        );
        break;
      case "xlinkArcrole":
        Nt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          u
        );
        break;
      case "xlinkRole":
        Nt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          u
        );
        break;
      case "xlinkShow":
        Nt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          u
        );
        break;
      case "xlinkTitle":
        Nt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          u
        );
        break;
      case "xlinkType":
        Nt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          u
        );
        break;
      case "xmlBase":
        Nt(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          u
        );
        break;
      case "xmlLang":
        Nt(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          u
        );
        break;
      case "xmlSpace":
        Nt(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          u
        );
        break;
      case "is":
        Ce(l, "is", u);
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        (!(2 < a.length) || a[0] !== "o" && a[0] !== "O" || a[1] !== "n" && a[1] !== "N") && (a = ry.get(a) || a, Ce(l, a, u));
    }
  }
  function Ic(l, t, a, u, e, n) {
    switch (a) {
      case "style":
        ls(l, u, n);
        break;
      case "dangerouslySetInnerHTML":
        if (u != null) {
          if (typeof u != "object" || !("__html" in u))
            throw Error(f(61));
          if (a = u.__html, a != null) {
            if (e.children != null) throw Error(f(60));
            l.innerHTML = a;
          }
        }
        break;
      case "children":
        typeof u == "string" ? ka(l, u) : (typeof u == "number" || typeof u == "bigint") && ka(l, "" + u);
        break;
      case "onScroll":
        u != null && w("scroll", l);
        break;
      case "onScrollEnd":
        u != null && w("scrollend", l);
        break;
      case "onClick":
        u != null && (l.onclick = Ht);
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "innerHTML":
      case "ref":
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        if (!Kf.hasOwnProperty(a))
          l: {
            if (a[0] === "o" && a[1] === "n" && (e = a.endsWith("Capture"), t = a.slice(2, e ? a.length - 7 : void 0), n = l[Vl] || null, n = n != null ? n[a] : null, typeof n == "function" && l.removeEventListener(t, n, e), typeof u == "function")) {
              typeof n != "function" && n !== null && (a in l ? l[a] = null : l.hasAttribute(a) && l.removeAttribute(a)), l.addEventListener(t, u, e);
              break l;
            }
            a in l ? l[a] = u : u === !0 ? l.setAttribute(a, "") : Ce(l, a, u);
          }
    }
  }
  function ql(l, t, a) {
    switch (t) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "img":
        w("error", l), w("load", l);
        var u = !1, e = !1, n;
        for (n in a)
          if (a.hasOwnProperty(n)) {
            var i = a[n];
            if (i != null)
              switch (n) {
                case "src":
                  u = !0;
                  break;
                case "srcSet":
                  e = !0;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(f(137, t));
                default:
                  il(l, t, n, i, a, null);
              }
          }
        e && il(l, t, "srcSet", a.srcSet, a, null), u && il(l, t, "src", a.src, a, null);
        return;
      case "input":
        w("invalid", l);
        var c = n = i = e = null, s = null, r = null;
        for (u in a)
          if (a.hasOwnProperty(u)) {
            var z = a[u];
            if (z != null)
              switch (u) {
                case "name":
                  e = z;
                  break;
                case "type":
                  i = z;
                  break;
                case "checked":
                  s = z;
                  break;
                case "defaultChecked":
                  r = z;
                  break;
                case "value":
                  n = z;
                  break;
                case "defaultValue":
                  c = z;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (z != null)
                    throw Error(f(137, t));
                  break;
                default:
                  il(l, t, u, z, a, null);
              }
          }
        kf(
          l,
          n,
          c,
          s,
          r,
          i,
          e,
          !1
        );
        return;
      case "select":
        w("invalid", l), u = i = n = null;
        for (e in a)
          if (a.hasOwnProperty(e) && (c = a[e], c != null))
            switch (e) {
              case "value":
                n = c;
                break;
              case "defaultValue":
                i = c;
                break;
              case "multiple":
                u = c;
              default:
                il(l, t, e, c, a, null);
            }
        t = n, a = i, l.multiple = !!u, t != null ? Wa(l, !!u, t, !1) : a != null && Wa(l, !!u, a, !0);
        return;
      case "textarea":
        w("invalid", l), n = e = u = null;
        for (i in a)
          if (a.hasOwnProperty(i) && (c = a[i], c != null))
            switch (i) {
              case "value":
                u = c;
                break;
              case "defaultValue":
                e = c;
                break;
              case "children":
                n = c;
                break;
              case "dangerouslySetInnerHTML":
                if (c != null) throw Error(f(91));
                break;
              default:
                il(l, t, i, c, a, null);
            }
        If(l, u, e, n);
        return;
      case "option":
        for (s in a)
          if (a.hasOwnProperty(s) && (u = a[s], u != null))
            switch (s) {
              case "selected":
                l.selected = u && typeof u != "function" && typeof u != "symbol";
                break;
              default:
                il(l, t, s, u, a, null);
            }
        return;
      case "dialog":
        w("beforetoggle", l), w("toggle", l), w("cancel", l), w("close", l);
        break;
      case "iframe":
      case "object":
        w("load", l);
        break;
      case "video":
      case "audio":
        for (u = 0; u < me.length; u++)
          w(me[u], l);
        break;
      case "image":
        w("error", l), w("load", l);
        break;
      case "details":
        w("toggle", l);
        break;
      case "embed":
      case "source":
      case "link":
        w("error", l), w("load", l);
      case "area":
      case "base":
      case "br":
      case "col":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "track":
      case "wbr":
      case "menuitem":
        for (r in a)
          if (a.hasOwnProperty(r) && (u = a[r], u != null))
            switch (r) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(f(137, t));
              default:
                il(l, t, r, u, a, null);
            }
        return;
      default:
        if (yi(t)) {
          for (z in a)
            a.hasOwnProperty(z) && (u = a[z], u !== void 0 && Ic(
              l,
              t,
              z,
              u,
              a,
              void 0
            ));
          return;
        }
    }
    for (c in a)
      a.hasOwnProperty(c) && (u = a[c], u != null && il(l, t, c, u, a, null));
  }
  function Lm(l, t, a, u) {
    switch (t) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "input":
        var e = null, n = null, i = null, c = null, s = null, r = null, z = null;
        for (b in a) {
          var A = a[b];
          if (a.hasOwnProperty(b) && A != null)
            switch (b) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                s = A;
              default:
                u.hasOwnProperty(b) || il(l, t, b, null, u, A);
            }
        }
        for (var g in u) {
          var b = u[g];
          if (A = a[g], u.hasOwnProperty(g) && (b != null || A != null))
            switch (g) {
              case "type":
                n = b;
                break;
              case "name":
                e = b;
                break;
              case "checked":
                r = b;
                break;
              case "defaultChecked":
                z = b;
                break;
              case "value":
                i = b;
                break;
              case "defaultValue":
                c = b;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (b != null)
                  throw Error(f(137, t));
                break;
              default:
                b !== A && il(
                  l,
                  t,
                  g,
                  b,
                  u,
                  A
                );
            }
        }
        oi(
          l,
          i,
          c,
          s,
          r,
          z,
          n,
          e
        );
        return;
      case "select":
        b = i = c = g = null;
        for (n in a)
          if (s = a[n], a.hasOwnProperty(n) && s != null)
            switch (n) {
              case "value":
                break;
              case "multiple":
                b = s;
              default:
                u.hasOwnProperty(n) || il(
                  l,
                  t,
                  n,
                  null,
                  u,
                  s
                );
            }
        for (e in u)
          if (n = u[e], s = a[e], u.hasOwnProperty(e) && (n != null || s != null))
            switch (e) {
              case "value":
                g = n;
                break;
              case "defaultValue":
                c = n;
                break;
              case "multiple":
                i = n;
              default:
                n !== s && il(
                  l,
                  t,
                  e,
                  n,
                  u,
                  s
                );
            }
        t = c, a = i, u = b, g != null ? Wa(l, !!a, g, !1) : !!u != !!a && (t != null ? Wa(l, !!a, t, !0) : Wa(l, !!a, a ? [] : "", !1));
        return;
      case "textarea":
        b = g = null;
        for (c in a)
          if (e = a[c], a.hasOwnProperty(c) && e != null && !u.hasOwnProperty(c))
            switch (c) {
              case "value":
                break;
              case "children":
                break;
              default:
                il(l, t, c, null, u, e);
            }
        for (i in u)
          if (e = u[i], n = a[i], u.hasOwnProperty(i) && (e != null || n != null))
            switch (i) {
              case "value":
                g = e;
                break;
              case "defaultValue":
                b = e;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (e != null) throw Error(f(91));
                break;
              default:
                e !== n && il(l, t, i, e, u, n);
            }
        Ff(l, g, b);
        return;
      case "option":
        for (var N in a)
          if (g = a[N], a.hasOwnProperty(N) && g != null && !u.hasOwnProperty(N))
            switch (N) {
              case "selected":
                l.selected = !1;
                break;
              default:
                il(
                  l,
                  t,
                  N,
                  null,
                  u,
                  g
                );
            }
        for (s in u)
          if (g = u[s], b = a[s], u.hasOwnProperty(s) && g !== b && (g != null || b != null))
            switch (s) {
              case "selected":
                l.selected = g && typeof g != "function" && typeof g != "symbol";
                break;
              default:
                il(
                  l,
                  t,
                  s,
                  g,
                  u,
                  b
                );
            }
        return;
      case "img":
      case "link":
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr":
      case "menuitem":
        for (var B in a)
          g = a[B], a.hasOwnProperty(B) && g != null && !u.hasOwnProperty(B) && il(l, t, B, null, u, g);
        for (r in u)
          if (g = u[r], b = a[r], u.hasOwnProperty(r) && g !== b && (g != null || b != null))
            switch (r) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (g != null)
                  throw Error(f(137, t));
                break;
              default:
                il(
                  l,
                  t,
                  r,
                  g,
                  u,
                  b
                );
            }
        return;
      default:
        if (yi(t)) {
          for (var cl in a)
            g = a[cl], a.hasOwnProperty(cl) && g !== void 0 && !u.hasOwnProperty(cl) && Ic(
              l,
              t,
              cl,
              void 0,
              u,
              g
            );
          for (z in u)
            g = u[z], b = a[z], !u.hasOwnProperty(z) || g === b || g === void 0 && b === void 0 || Ic(
              l,
              t,
              z,
              g,
              u,
              b
            );
          return;
        }
    }
    for (var m in a)
      g = a[m], a.hasOwnProperty(m) && g != null && !u.hasOwnProperty(m) && il(l, t, m, null, u, g);
    for (A in u)
      g = u[A], b = a[A], !u.hasOwnProperty(A) || g === b || g == null && b == null || il(l, t, A, g, u, b);
  }
  function ad(l) {
    switch (l) {
      case "css":
      case "script":
      case "font":
      case "img":
      case "image":
      case "input":
      case "link":
        return !0;
      default:
        return !1;
    }
  }
  function Vm() {
    if (typeof performance.getEntriesByType == "function") {
      for (var l = 0, t = 0, a = performance.getEntriesByType("resource"), u = 0; u < a.length; u++) {
        var e = a[u], n = e.transferSize, i = e.initiatorType, c = e.duration;
        if (n && c && ad(i)) {
          for (i = 0, c = e.responseEnd, u += 1; u < a.length; u++) {
            var s = a[u], r = s.startTime;
            if (r > c) break;
            var z = s.transferSize, A = s.initiatorType;
            z && ad(A) && (s = s.responseEnd, i += z * (s < c ? 1 : (c - r) / (s - r)));
          }
          if (--u, t += 8 * (n + i) / (e.duration / 1e3), l++, 10 < l) break;
        }
      }
      if (0 < l) return t / l / 1e6;
    }
    return navigator.connection && (l = navigator.connection.downlink, typeof l == "number") ? l : 5;
  }
  var Pc = null, lf = null;
  function Hn(l) {
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  function ud(l) {
    switch (l) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function ed(l, t) {
    if (l === 0)
      switch (t) {
        case "svg":
          return 1;
        case "math":
          return 2;
        default:
          return 0;
      }
    return l === 1 && t === "foreignObject" ? 0 : l;
  }
  function tf(l, t) {
    return l === "textarea" || l === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var af = null;
  function Km() {
    var l = window.event;
    return l && l.type === "popstate" ? l === af ? !1 : (af = l, !0) : (af = null, !1);
  }
  var nd = typeof setTimeout == "function" ? setTimeout : void 0, Jm = typeof clearTimeout == "function" ? clearTimeout : void 0, id = typeof Promise == "function" ? Promise : void 0, wm = typeof queueMicrotask == "function" ? queueMicrotask : typeof id < "u" ? function(l) {
    return id.resolve(null).then(l).catch($m);
  } : nd;
  function $m(l) {
    setTimeout(function() {
      throw l;
    });
  }
  function ha(l) {
    return l === "head";
  }
  function cd(l, t) {
    var a = t, u = 0;
    do {
      var e = a.nextSibling;
      if (l.removeChild(a), e && e.nodeType === 8)
        if (a = e.data, a === "/$" || a === "/&") {
          if (u === 0) {
            l.removeChild(e), Mu(t);
            return;
          }
          u--;
        } else if (a === "$" || a === "$?" || a === "$~" || a === "$!" || a === "&")
          u++;
        else if (a === "html")
          he(l.ownerDocument.documentElement);
        else if (a === "head") {
          a = l.ownerDocument.head, he(a);
          for (var n = a.firstChild; n; ) {
            var i = n.nextSibling, c = n.nodeName;
            n[Ru] || c === "SCRIPT" || c === "STYLE" || c === "LINK" && n.rel.toLowerCase() === "stylesheet" || a.removeChild(n), n = i;
          }
        } else
          a === "body" && he(l.ownerDocument.body);
      a = e;
    } while (a);
    Mu(t);
  }
  function fd(l, t) {
    var a = l;
    l = 0;
    do {
      var u = a.nextSibling;
      if (a.nodeType === 1 ? t ? (a._stashedDisplay = a.style.display, a.style.display = "none") : (a.style.display = a._stashedDisplay || "", a.getAttribute("style") === "" && a.removeAttribute("style")) : a.nodeType === 3 && (t ? (a._stashedText = a.nodeValue, a.nodeValue = "") : a.nodeValue = a._stashedText || ""), u && u.nodeType === 8)
        if (a = u.data, a === "/$") {
          if (l === 0) break;
          l--;
        } else
          a !== "$" && a !== "$?" && a !== "$~" && a !== "$!" || l++;
      a = u;
    } while (a);
  }
  function uf(l) {
    var t = l.firstChild;
    for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
      var a = t;
      switch (t = t.nextSibling, a.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          uf(a), fi(a);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if (a.rel.toLowerCase() === "stylesheet") continue;
      }
      l.removeChild(a);
    }
  }
  function Wm(l, t, a, u) {
    for (; l.nodeType === 1; ) {
      var e = a;
      if (l.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!u && (l.nodeName !== "INPUT" || l.type !== "hidden"))
          break;
      } else if (u) {
        if (!l[Ru])
          switch (t) {
            case "meta":
              if (!l.hasAttribute("itemprop")) break;
              return l;
            case "link":
              if (n = l.getAttribute("rel"), n === "stylesheet" && l.hasAttribute("data-precedence"))
                break;
              if (n !== e.rel || l.getAttribute("href") !== (e.href == null || e.href === "" ? null : e.href) || l.getAttribute("crossorigin") !== (e.crossOrigin == null ? null : e.crossOrigin) || l.getAttribute("title") !== (e.title == null ? null : e.title))
                break;
              return l;
            case "style":
              if (l.hasAttribute("data-precedence")) break;
              return l;
            case "script":
              if (n = l.getAttribute("src"), (n !== (e.src == null ? null : e.src) || l.getAttribute("type") !== (e.type == null ? null : e.type) || l.getAttribute("crossorigin") !== (e.crossOrigin == null ? null : e.crossOrigin)) && n && l.hasAttribute("async") && !l.hasAttribute("itemprop"))
                break;
              return l;
            default:
              return l;
          }
      } else if (t === "input" && l.type === "hidden") {
        var n = e.name == null ? null : "" + e.name;
        if (e.type === "hidden" && l.getAttribute("name") === n)
          return l;
      } else return l;
      if (l = rt(l.nextSibling), l === null) break;
    }
    return null;
  }
  function km(l, t, a) {
    if (t === "") return null;
    for (; l.nodeType !== 3; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !a || (l = rt(l.nextSibling), l === null)) return null;
    return l;
  }
  function sd(l, t) {
    for (; l.nodeType !== 8; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !t || (l = rt(l.nextSibling), l === null)) return null;
    return l;
  }
  function ef(l) {
    return l.data === "$?" || l.data === "$~";
  }
  function nf(l) {
    return l.data === "$!" || l.data === "$?" && l.ownerDocument.readyState !== "loading";
  }
  function Fm(l, t) {
    var a = l.ownerDocument;
    if (l.data === "$~") l._reactRetry = t;
    else if (l.data !== "$?" || a.readyState !== "loading")
      t();
    else {
      var u = function() {
        t(), a.removeEventListener("DOMContentLoaded", u);
      };
      a.addEventListener("DOMContentLoaded", u), l._reactRetry = u;
    }
  }
  function rt(l) {
    for (; l != null; l = l.nextSibling) {
      var t = l.nodeType;
      if (t === 1 || t === 3) break;
      if (t === 8) {
        if (t = l.data, t === "$" || t === "$!" || t === "$?" || t === "$~" || t === "&" || t === "F!" || t === "F")
          break;
        if (t === "/$" || t === "/&") return null;
      }
    }
    return l;
  }
  var cf = null;
  function od(l) {
    l = l.nextSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var a = l.data;
        if (a === "/$" || a === "/&") {
          if (t === 0)
            return rt(l.nextSibling);
          t--;
        } else
          a !== "$" && a !== "$!" && a !== "$?" && a !== "$~" && a !== "&" || t++;
      }
      l = l.nextSibling;
    }
    return null;
  }
  function dd(l) {
    l = l.previousSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var a = l.data;
        if (a === "$" || a === "$!" || a === "$?" || a === "$~" || a === "&") {
          if (t === 0) return l;
          t--;
        } else a !== "/$" && a !== "/&" || t++;
      }
      l = l.previousSibling;
    }
    return null;
  }
  function yd(l, t, a) {
    switch (t = Hn(a), l) {
      case "html":
        if (l = t.documentElement, !l) throw Error(f(452));
        return l;
      case "head":
        if (l = t.head, !l) throw Error(f(453));
        return l;
      case "body":
        if (l = t.body, !l) throw Error(f(454));
        return l;
      default:
        throw Error(f(451));
    }
  }
  function he(l) {
    for (var t = l.attributes; t.length; )
      l.removeAttributeNode(t[0]);
    fi(l);
  }
  var gt = /* @__PURE__ */ new Map(), md = /* @__PURE__ */ new Set();
  function Cn(l) {
    return typeof l.getRootNode == "function" ? l.getRootNode() : l.nodeType === 9 ? l : l.ownerDocument;
  }
  var wt = M.d;
  M.d = {
    f: Im,
    r: Pm,
    D: lv,
    C: tv,
    L: av,
    m: uv,
    X: nv,
    S: ev,
    M: iv
  };
  function Im() {
    var l = wt.f(), t = pn();
    return l || t;
  }
  function Pm(l) {
    var t = Ja(l);
    t !== null && t.tag === 5 && t.type === "form" ? No(t) : wt.r(l);
  }
  var Au = typeof document > "u" ? null : document;
  function vd(l, t, a) {
    var u = Au;
    if (u && typeof t == "string" && t) {
      var e = st(t);
      e = 'link[rel="' + l + '"][href="' + e + '"]', typeof a == "string" && (e += '[crossorigin="' + a + '"]'), md.has(e) || (md.add(e), l = { rel: l, crossOrigin: a, href: t }, u.querySelector(e) === null && (t = u.createElement("link"), ql(t, "link", l), Dl(t), u.head.appendChild(t)));
    }
  }
  function lv(l) {
    wt.D(l), vd("dns-prefetch", l, null);
  }
  function tv(l, t) {
    wt.C(l, t), vd("preconnect", l, t);
  }
  function av(l, t, a) {
    wt.L(l, t, a);
    var u = Au;
    if (u && l && t) {
      var e = 'link[rel="preload"][as="' + st(t) + '"]';
      t === "image" && a && a.imageSrcSet ? (e += '[imagesrcset="' + st(
        a.imageSrcSet
      ) + '"]', typeof a.imageSizes == "string" && (e += '[imagesizes="' + st(
        a.imageSizes
      ) + '"]')) : e += '[href="' + st(l) + '"]';
      var n = e;
      switch (t) {
        case "style":
          n = _u(l);
          break;
        case "script":
          n = Ou(l);
      }
      gt.has(n) || (l = q(
        {
          rel: "preload",
          href: t === "image" && a && a.imageSrcSet ? void 0 : l,
          as: t
        },
        a
      ), gt.set(n, l), u.querySelector(e) !== null || t === "style" && u.querySelector(re(n)) || t === "script" && u.querySelector(ge(n)) || (t = u.createElement("link"), ql(t, "link", l), Dl(t), u.head.appendChild(t)));
    }
  }
  function uv(l, t) {
    wt.m(l, t);
    var a = Au;
    if (a && l) {
      var u = t && typeof t.as == "string" ? t.as : "script", e = 'link[rel="modulepreload"][as="' + st(u) + '"][href="' + st(l) + '"]', n = e;
      switch (u) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = Ou(l);
      }
      if (!gt.has(n) && (l = q({ rel: "modulepreload", href: l }, t), gt.set(n, l), a.querySelector(e) === null)) {
        switch (u) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(ge(n)))
              return;
        }
        u = a.createElement("link"), ql(u, "link", l), Dl(u), a.head.appendChild(u);
      }
    }
  }
  function ev(l, t, a) {
    wt.S(l, t, a);
    var u = Au;
    if (u && l) {
      var e = wa(u).hoistableStyles, n = _u(l);
      t = t || "default";
      var i = e.get(n);
      if (!i) {
        var c = { loading: 0, preload: null };
        if (i = u.querySelector(
          re(n)
        ))
          c.loading = 5;
        else {
          l = q(
            { rel: "stylesheet", href: l, "data-precedence": t },
            a
          ), (a = gt.get(n)) && ff(l, a);
          var s = i = u.createElement("link");
          Dl(s), ql(s, "link", l), s._p = new Promise(function(r, z) {
            s.onload = r, s.onerror = z;
          }), s.addEventListener("load", function() {
            c.loading |= 1;
          }), s.addEventListener("error", function() {
            c.loading |= 2;
          }), c.loading |= 4, Rn(i, t, u);
        }
        i = {
          type: "stylesheet",
          instance: i,
          count: 1,
          state: c
        }, e.set(n, i);
      }
    }
  }
  function nv(l, t) {
    wt.X(l, t);
    var a = Au;
    if (a && l) {
      var u = wa(a).hoistableScripts, e = Ou(l), n = u.get(e);
      n || (n = a.querySelector(ge(e)), n || (l = q({ src: l, async: !0 }, t), (t = gt.get(e)) && sf(l, t), n = a.createElement("script"), Dl(n), ql(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function iv(l, t) {
    wt.M(l, t);
    var a = Au;
    if (a && l) {
      var u = wa(a).hoistableScripts, e = Ou(l), n = u.get(e);
      n || (n = a.querySelector(ge(e)), n || (l = q({ src: l, async: !0, type: "module" }, t), (t = gt.get(e)) && sf(l, t), n = a.createElement("script"), Dl(n), ql(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function hd(l, t, a, u) {
    var e = (e = K.current) ? Cn(e) : null;
    if (!e) throw Error(f(446));
    switch (l) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof a.precedence == "string" && typeof a.href == "string" ? (t = _u(a.href), a = wa(
          e
        ).hoistableStyles, u = a.get(t), u || (u = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, a.set(t, u)), u) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (a.rel === "stylesheet" && typeof a.href == "string" && typeof a.precedence == "string") {
          l = _u(a.href);
          var n = wa(
            e
          ).hoistableStyles, i = n.get(l);
          if (i || (e = e.ownerDocument || e, i = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, n.set(l, i), (n = e.querySelector(
            re(l)
          )) && !n._p && (i.instance = n, i.state.loading = 5), gt.has(l) || (a = {
            rel: "preload",
            as: "style",
            href: a.href,
            crossOrigin: a.crossOrigin,
            integrity: a.integrity,
            media: a.media,
            hrefLang: a.hrefLang,
            referrerPolicy: a.referrerPolicy
          }, gt.set(l, a), n || cv(
            e,
            l,
            a,
            i.state
          ))), t && u === null)
            throw Error(f(528, ""));
          return i;
        }
        if (t && u !== null)
          throw Error(f(529, ""));
        return null;
      case "script":
        return t = a.async, a = a.src, typeof a == "string" && t && typeof t != "function" && typeof t != "symbol" ? (t = Ou(a), a = wa(
          e
        ).hoistableScripts, u = a.get(t), u || (u = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, a.set(t, u)), u) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(f(444, l));
    }
  }
  function _u(l) {
    return 'href="' + st(l) + '"';
  }
  function re(l) {
    return 'link[rel="stylesheet"][' + l + "]";
  }
  function rd(l) {
    return q({}, l, {
      "data-precedence": l.precedence,
      precedence: null
    });
  }
  function cv(l, t, a, u) {
    l.querySelector('link[rel="preload"][as="style"][' + t + "]") ? u.loading = 1 : (t = l.createElement("link"), u.preload = t, t.addEventListener("load", function() {
      return u.loading |= 1;
    }), t.addEventListener("error", function() {
      return u.loading |= 2;
    }), ql(t, "link", a), Dl(t), l.head.appendChild(t));
  }
  function Ou(l) {
    return '[src="' + st(l) + '"]';
  }
  function ge(l) {
    return "script[async]" + l;
  }
  function gd(l, t, a) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var u = l.querySelector(
            'style[data-href~="' + st(a.href) + '"]'
          );
          if (u)
            return t.instance = u, Dl(u), u;
          var e = q({}, a, {
            "data-href": a.href,
            "data-precedence": a.precedence,
            href: null,
            precedence: null
          });
          return u = (l.ownerDocument || l).createElement(
            "style"
          ), Dl(u), ql(u, "style", e), Rn(u, a.precedence, l), t.instance = u;
        case "stylesheet":
          e = _u(a.href);
          var n = l.querySelector(
            re(e)
          );
          if (n)
            return t.state.loading |= 4, t.instance = n, Dl(n), n;
          u = rd(a), (e = gt.get(e)) && ff(u, e), n = (l.ownerDocument || l).createElement("link"), Dl(n);
          var i = n;
          return i._p = new Promise(function(c, s) {
            i.onload = c, i.onerror = s;
          }), ql(n, "link", u), t.state.loading |= 4, Rn(n, a.precedence, l), t.instance = n;
        case "script":
          return n = Ou(a.src), (e = l.querySelector(
            ge(n)
          )) ? (t.instance = e, Dl(e), e) : (u = a, (e = gt.get(n)) && (u = q({}, a), sf(u, e)), l = l.ownerDocument || l, e = l.createElement("script"), Dl(e), ql(e, "link", u), l.head.appendChild(e), t.instance = e);
        case "void":
          return null;
        default:
          throw Error(f(443, t.type));
      }
    else
      t.type === "stylesheet" && (t.state.loading & 4) === 0 && (u = t.instance, t.state.loading |= 4, Rn(u, a.precedence, l));
    return t.instance;
  }
  function Rn(l, t, a) {
    for (var u = a.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), e = u.length ? u[u.length - 1] : null, n = e, i = 0; i < u.length; i++) {
      var c = u[i];
      if (c.dataset.precedence === t) n = c;
      else if (n !== e) break;
    }
    n ? n.parentNode.insertBefore(l, n.nextSibling) : (t = a.nodeType === 9 ? a.head : a, t.insertBefore(l, t.firstChild));
  }
  function ff(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.title == null && (l.title = t.title);
  }
  function sf(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.integrity == null && (l.integrity = t.integrity);
  }
  var xn = null;
  function Sd(l, t, a) {
    if (xn === null) {
      var u = /* @__PURE__ */ new Map(), e = xn = /* @__PURE__ */ new Map();
      e.set(a, u);
    } else
      e = xn, u = e.get(a), u || (u = /* @__PURE__ */ new Map(), e.set(a, u));
    if (u.has(l)) return u;
    for (u.set(l, null), a = a.getElementsByTagName(l), e = 0; e < a.length; e++) {
      var n = a[e];
      if (!(n[Ru] || n[Hl] || l === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
        var i = n.getAttribute(t) || "";
        i = l + i;
        var c = u.get(i);
        c ? c.push(n) : u.set(i, [n]);
      }
    }
    return u;
  }
  function bd(l, t, a) {
    l = l.ownerDocument || l, l.head.insertBefore(
      a,
      t === "title" ? l.querySelector("head > title") : null
    );
  }
  function fv(l, t, a) {
    if (a === 1 || t.itemProp != null) return !1;
    switch (l) {
      case "meta":
      case "title":
        return !0;
      case "style":
        if (typeof t.precedence != "string" || typeof t.href != "string" || t.href === "")
          break;
        return !0;
      case "link":
        if (typeof t.rel != "string" || typeof t.href != "string" || t.href === "" || t.onLoad || t.onError)
          break;
        switch (t.rel) {
          case "stylesheet":
            return l = t.disabled, typeof t.precedence == "string" && l == null;
          default:
            return !0;
        }
      case "script":
        if (t.async && typeof t.async != "function" && typeof t.async != "symbol" && !t.onLoad && !t.onError && t.src && typeof t.src == "string")
          return !0;
    }
    return !1;
  }
  function zd(l) {
    return !(l.type === "stylesheet" && (l.state.loading & 3) === 0);
  }
  function sv(l, t, a, u) {
    if (a.type === "stylesheet" && (typeof u.media != "string" || matchMedia(u.media).matches !== !1) && (a.state.loading & 4) === 0) {
      if (a.instance === null) {
        var e = _u(u.href), n = t.querySelector(
          re(e)
        );
        if (n) {
          t = n._p, t !== null && typeof t == "object" && typeof t.then == "function" && (l.count++, l = qn.bind(l), t.then(l, l)), a.state.loading |= 4, a.instance = n, Dl(n);
          return;
        }
        n = t.ownerDocument || t, u = rd(u), (e = gt.get(e)) && ff(u, e), n = n.createElement("link"), Dl(n);
        var i = n;
        i._p = new Promise(function(c, s) {
          i.onload = c, i.onerror = s;
        }), ql(n, "link", u), a.instance = n;
      }
      l.stylesheets === null && (l.stylesheets = /* @__PURE__ */ new Map()), l.stylesheets.set(a, t), (t = a.state.preload) && (a.state.loading & 3) === 0 && (l.count++, a = qn.bind(l), t.addEventListener("load", a), t.addEventListener("error", a));
    }
  }
  var of = 0;
  function ov(l, t) {
    return l.stylesheets && l.count === 0 && Yn(l, l.stylesheets), 0 < l.count || 0 < l.imgCount ? function(a) {
      var u = setTimeout(function() {
        if (l.stylesheets && Yn(l, l.stylesheets), l.unsuspend) {
          var n = l.unsuspend;
          l.unsuspend = null, n();
        }
      }, 6e4 + t);
      0 < l.imgBytes && of === 0 && (of = 62500 * Vm());
      var e = setTimeout(
        function() {
          if (l.waitingForImages = !1, l.count === 0 && (l.stylesheets && Yn(l, l.stylesheets), l.unsuspend)) {
            var n = l.unsuspend;
            l.unsuspend = null, n();
          }
        },
        (l.imgBytes > of ? 50 : 800) + t
      );
      return l.unsuspend = a, function() {
        l.unsuspend = null, clearTimeout(u), clearTimeout(e);
      };
    } : null;
  }
  function qn() {
    if (this.count--, this.count === 0 && (this.imgCount === 0 || !this.waitingForImages)) {
      if (this.stylesheets) Yn(this, this.stylesheets);
      else if (this.unsuspend) {
        var l = this.unsuspend;
        this.unsuspend = null, l();
      }
    }
  }
  var Bn = null;
  function Yn(l, t) {
    l.stylesheets = null, l.unsuspend !== null && (l.count++, Bn = /* @__PURE__ */ new Map(), t.forEach(dv, l), Bn = null, qn.call(l));
  }
  function dv(l, t) {
    if (!(t.state.loading & 4)) {
      var a = Bn.get(l);
      if (a) var u = a.get(null);
      else {
        a = /* @__PURE__ */ new Map(), Bn.set(l, a);
        for (var e = l.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), n = 0; n < e.length; n++) {
          var i = e[n];
          (i.nodeName === "LINK" || i.getAttribute("media") !== "not all") && (a.set(i.dataset.precedence, i), u = i);
        }
        u && a.set(null, u);
      }
      e = t.instance, i = e.getAttribute("data-precedence"), n = a.get(i) || u, n === u && a.set(null, e), a.set(i, e), this.count++, u = qn.bind(this), e.addEventListener("load", u), e.addEventListener("error", u), n ? n.parentNode.insertBefore(e, n.nextSibling) : (l = l.nodeType === 9 ? l.head : l, l.insertBefore(e, l.firstChild)), t.state.loading |= 4;
    }
  }
  var Se = {
    $$typeof: Bl,
    Provider: null,
    Consumer: null,
    _currentValue: Y,
    _currentValue2: Y,
    _threadCount: 0
  };
  function yv(l, t, a, u, e, n, i, c, s) {
    this.tag = 1, this.containerInfo = l, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = ei(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = ei(0), this.hiddenUpdates = ei(null), this.identifierPrefix = u, this.onUncaughtError = e, this.onCaughtError = n, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = s, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Ed(l, t, a, u, e, n, i, c, s, r, z, A) {
    return l = new yv(
      l,
      t,
      a,
      i,
      s,
      r,
      z,
      A,
      c
    ), t = 1, n === !0 && (t |= 24), n = tt(3, null, null, t), l.current = n, n.stateNode = l, t = Zi(), t.refCount++, l.pooledCache = t, t.refCount++, n.memoizedState = {
      element: u,
      isDehydrated: a,
      cache: t
    }, Ji(n), l;
  }
  function Td(l) {
    return l ? (l = uu, l) : uu;
  }
  function pd(l, t, a, u, e, n) {
    e = Td(e), u.context === null ? u.context = e : u.pendingContext = e, u = ea(t), u.payload = { element: a }, n = n === void 0 ? null : n, n !== null && (u.callback = n), a = na(l, u, t), a !== null && (kl(a, l, t), ku(a, l, t));
  }
  function Ad(l, t) {
    if (l = l.memoizedState, l !== null && l.dehydrated !== null) {
      var a = l.retryLane;
      l.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function df(l, t) {
    Ad(l, t), (l = l.alternate) && Ad(l, t);
  }
  function _d(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = Ua(l, 67108864);
      t !== null && kl(t, l, 67108864), df(l, 67108864);
    }
  }
  function Od(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = it();
      t = ni(t);
      var a = Ua(l, t);
      a !== null && kl(a, l, t), df(l, t);
    }
  }
  var jn = !0;
  function mv(l, t, a, u) {
    var e = E.T;
    E.T = null;
    var n = M.p;
    try {
      M.p = 2, yf(l, t, a, u);
    } finally {
      M.p = n, E.T = e;
    }
  }
  function vv(l, t, a, u) {
    var e = E.T;
    E.T = null;
    var n = M.p;
    try {
      M.p = 8, yf(l, t, a, u);
    } finally {
      M.p = n, E.T = e;
    }
  }
  function yf(l, t, a, u) {
    if (jn) {
      var e = mf(u);
      if (e === null)
        Fc(
          l,
          t,
          u,
          Gn,
          a
        ), Dd(l, u);
      else if (rv(
        e,
        l,
        t,
        a,
        u
      ))
        u.stopPropagation();
      else if (Dd(l, u), t & 4 && -1 < hv.indexOf(l)) {
        for (; e !== null; ) {
          var n = Ja(e);
          if (n !== null)
            switch (n.tag) {
              case 3:
                if (n = n.stateNode, n.current.memoizedState.isDehydrated) {
                  var i = Aa(n.pendingLanes);
                  if (i !== 0) {
                    var c = n;
                    for (c.pendingLanes |= 2, c.entangledLanes |= 2; i; ) {
                      var s = 1 << 31 - Pl(i);
                      c.entanglements[1] |= s, i &= ~s;
                    }
                    Dt(n), (ll & 6) === 0 && (En = Fl() + 500, ye(0));
                  }
                }
                break;
              case 31:
              case 13:
                c = Ua(n, 2), c !== null && kl(c, n, 2), pn(), df(n, 2);
            }
          if (n = mf(u), n === null && Fc(
            l,
            t,
            u,
            Gn,
            a
          ), n === e) break;
          e = n;
        }
        e !== null && u.stopPropagation();
      } else
        Fc(
          l,
          t,
          u,
          null,
          a
        );
    }
  }
  function mf(l) {
    return l = vi(l), vf(l);
  }
  var Gn = null;
  function vf(l) {
    if (Gn = null, l = Ka(l), l !== null) {
      var t = X(l);
      if (t === null) l = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (l = j(t), l !== null) return l;
          l = null;
        } else if (a === 31) {
          if (l = U(t), l !== null) return l;
          l = null;
        } else if (a === 3) {
          if (t.stateNode.current.memoizedState.isDehydrated)
            return t.tag === 3 ? t.stateNode.containerInfo : null;
          l = null;
        } else t !== l && (l = null);
      }
    }
    return Gn = l, null;
  }
  function Md(l) {
    switch (l) {
      case "beforetoggle":
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "toggle":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 2;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 8;
      case "message":
        switch (ly()) {
          case xf:
            return 2;
          case qf:
            return 8;
          case Me:
          case ty:
            return 32;
          case Bf:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var hf = !1, ra = null, ga = null, Sa = null, be = /* @__PURE__ */ new Map(), ze = /* @__PURE__ */ new Map(), ba = [], hv = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function Dd(l, t) {
    switch (l) {
      case "focusin":
      case "focusout":
        ra = null;
        break;
      case "dragenter":
      case "dragleave":
        ga = null;
        break;
      case "mouseover":
      case "mouseout":
        Sa = null;
        break;
      case "pointerover":
      case "pointerout":
        be.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        ze.delete(t.pointerId);
    }
  }
  function Ee(l, t, a, u, e, n) {
    return l === null || l.nativeEvent !== n ? (l = {
      blockedOn: t,
      domEventName: a,
      eventSystemFlags: u,
      nativeEvent: n,
      targetContainers: [e]
    }, t !== null && (t = Ja(t), t !== null && _d(t)), l) : (l.eventSystemFlags |= u, t = l.targetContainers, e !== null && t.indexOf(e) === -1 && t.push(e), l);
  }
  function rv(l, t, a, u, e) {
    switch (t) {
      case "focusin":
        return ra = Ee(
          ra,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "dragenter":
        return ga = Ee(
          ga,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "mouseover":
        return Sa = Ee(
          Sa,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "pointerover":
        var n = e.pointerId;
        return be.set(
          n,
          Ee(
            be.get(n) || null,
            l,
            t,
            a,
            u,
            e
          )
        ), !0;
      case "gotpointercapture":
        return n = e.pointerId, ze.set(
          n,
          Ee(
            ze.get(n) || null,
            l,
            t,
            a,
            u,
            e
          )
        ), !0;
    }
    return !1;
  }
  function Ud(l) {
    var t = Ka(l.target);
    if (t !== null) {
      var a = X(t);
      if (a !== null) {
        if (t = a.tag, t === 13) {
          if (t = j(a), t !== null) {
            l.blockedOn = t, Zf(l.priority, function() {
              Od(a);
            });
            return;
          }
        } else if (t === 31) {
          if (t = U(a), t !== null) {
            l.blockedOn = t, Zf(l.priority, function() {
              Od(a);
            });
            return;
          }
        } else if (t === 3 && a.stateNode.current.memoizedState.isDehydrated) {
          l.blockedOn = a.tag === 3 ? a.stateNode.containerInfo : null;
          return;
        }
      }
    }
    l.blockedOn = null;
  }
  function Xn(l) {
    if (l.blockedOn !== null) return !1;
    for (var t = l.targetContainers; 0 < t.length; ) {
      var a = mf(l.nativeEvent);
      if (a === null) {
        a = l.nativeEvent;
        var u = new a.constructor(
          a.type,
          a
        );
        mi = u, a.target.dispatchEvent(u), mi = null;
      } else
        return t = Ja(a), t !== null && _d(t), l.blockedOn = a, !1;
      t.shift();
    }
    return !0;
  }
  function Nd(l, t, a) {
    Xn(l) && a.delete(t);
  }
  function gv() {
    hf = !1, ra !== null && Xn(ra) && (ra = null), ga !== null && Xn(ga) && (ga = null), Sa !== null && Xn(Sa) && (Sa = null), be.forEach(Nd), ze.forEach(Nd);
  }
  function Qn(l, t) {
    l.blockedOn === t && (l.blockedOn = null, hf || (hf = !0, o.unstable_scheduleCallback(
      o.unstable_NormalPriority,
      gv
    )));
  }
  var Zn = null;
  function Hd(l) {
    Zn !== l && (Zn = l, o.unstable_scheduleCallback(
      o.unstable_NormalPriority,
      function() {
        Zn === l && (Zn = null);
        for (var t = 0; t < l.length; t += 3) {
          var a = l[t], u = l[t + 1], e = l[t + 2];
          if (typeof u != "function") {
            if (vf(u || a) === null)
              continue;
            break;
          }
          var n = Ja(a);
          n !== null && (l.splice(t, 3), t -= 3, yc(
            n,
            {
              pending: !0,
              data: e,
              method: a.method,
              action: u
            },
            u,
            e
          ));
        }
      }
    ));
  }
  function Mu(l) {
    function t(s) {
      return Qn(s, l);
    }
    ra !== null && Qn(ra, l), ga !== null && Qn(ga, l), Sa !== null && Qn(Sa, l), be.forEach(t), ze.forEach(t);
    for (var a = 0; a < ba.length; a++) {
      var u = ba[a];
      u.blockedOn === l && (u.blockedOn = null);
    }
    for (; 0 < ba.length && (a = ba[0], a.blockedOn === null); )
      Ud(a), a.blockedOn === null && ba.shift();
    if (a = (l.ownerDocument || l).$$reactFormReplay, a != null)
      for (u = 0; u < a.length; u += 3) {
        var e = a[u], n = a[u + 1], i = e[Vl] || null;
        if (typeof n == "function")
          i || Hd(a);
        else if (i) {
          var c = null;
          if (n && n.hasAttribute("formAction")) {
            if (e = n, i = n[Vl] || null)
              c = i.formAction;
            else if (vf(e) !== null) continue;
          } else c = i.action;
          typeof c == "function" ? a[u + 1] = c : (a.splice(u, 3), u -= 3), Hd(a);
        }
      }
  }
  function Cd() {
    function l(n) {
      n.canIntercept && n.info === "react-transition" && n.intercept({
        handler: function() {
          return new Promise(function(i) {
            return e = i;
          });
        },
        focusReset: "manual",
        scroll: "manual"
      });
    }
    function t() {
      e !== null && (e(), e = null), u || setTimeout(a, 20);
    }
    function a() {
      if (!u && !navigation.transition) {
        var n = navigation.currentEntry;
        n && n.url != null && navigation.navigate(n.url, {
          state: n.getState(),
          info: "react-transition",
          history: "replace"
        });
      }
    }
    if (typeof navigation == "object") {
      var u = !1, e = null;
      return navigation.addEventListener("navigate", l), navigation.addEventListener("navigatesuccess", t), navigation.addEventListener("navigateerror", t), setTimeout(a, 100), function() {
        u = !0, navigation.removeEventListener("navigate", l), navigation.removeEventListener("navigatesuccess", t), navigation.removeEventListener("navigateerror", t), e !== null && (e(), e = null);
      };
    }
  }
  function rf(l) {
    this._internalRoot = l;
  }
  Ln.prototype.render = rf.prototype.render = function(l) {
    var t = this._internalRoot;
    if (t === null) throw Error(f(409));
    var a = t.current, u = it();
    pd(a, u, l, t, null, null);
  }, Ln.prototype.unmount = rf.prototype.unmount = function() {
    var l = this._internalRoot;
    if (l !== null) {
      this._internalRoot = null;
      var t = l.containerInfo;
      pd(l.current, 2, null, l, null, null), pn(), t[Va] = null;
    }
  };
  function Ln(l) {
    this._internalRoot = l;
  }
  Ln.prototype.unstable_scheduleHydration = function(l) {
    if (l) {
      var t = Qf();
      l = { blockedOn: null, target: l, priority: t };
      for (var a = 0; a < ba.length && t !== 0 && t < ba[a].priority; a++) ;
      ba.splice(a, 0, l), a === 0 && Ud(l);
    }
  };
  var Rd = v.version;
  if (Rd !== "19.2.6")
    throw Error(
      f(
        527,
        Rd,
        "19.2.6"
      )
    );
  M.findDOMNode = function(l) {
    var t = l._reactInternals;
    if (t === void 0)
      throw typeof l.render == "function" ? Error(f(188)) : (l = Object.keys(l).join(","), Error(f(268, l)));
    return l = p(t), l = l !== null ? V(l) : null, l = l === null ? null : l.stateNode, l;
  };
  var Sv = {
    bundleType: 0,
    version: "19.2.6",
    rendererPackageName: "react-dom",
    currentDispatcherRef: E,
    reconcilerVersion: "19.2.6"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Vn = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Vn.isDisabled && Vn.supportsFiber)
      try {
        Nu = Vn.inject(
          Sv
        ), Il = Vn;
      } catch {
      }
  }
  return Te.createRoot = function(l, t) {
    if (!R(l)) throw Error(f(299));
    var a = !1, u = "", e = Xo, n = Qo, i = Zo;
    return t != null && (t.unstable_strictMode === !0 && (a = !0), t.identifierPrefix !== void 0 && (u = t.identifierPrefix), t.onUncaughtError !== void 0 && (e = t.onUncaughtError), t.onCaughtError !== void 0 && (n = t.onCaughtError), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = Ed(
      l,
      1,
      !1,
      null,
      null,
      a,
      u,
      null,
      e,
      n,
      i,
      Cd
    ), l[Va] = t.current, kc(l), new rf(t);
  }, Te.hydrateRoot = function(l, t, a) {
    if (!R(l)) throw Error(f(299));
    var u = !1, e = "", n = Xo, i = Qo, c = Zo, s = null;
    return a != null && (a.unstable_strictMode === !0 && (u = !0), a.identifierPrefix !== void 0 && (e = a.identifierPrefix), a.onUncaughtError !== void 0 && (n = a.onUncaughtError), a.onCaughtError !== void 0 && (i = a.onCaughtError), a.onRecoverableError !== void 0 && (c = a.onRecoverableError), a.formState !== void 0 && (s = a.formState)), t = Ed(
      l,
      1,
      !0,
      t,
      a ?? null,
      u,
      e,
      s,
      n,
      i,
      c,
      Cd
    ), t.context = Td(null), a = t.current, u = it(), u = ni(u), e = ea(u), e.callback = null, na(a, e, u), a = u, t.current.lanes = a, Cu(t, a), Dt(t), l[Va] = t.current, kc(l), new Ln(t);
  }, Te.version = "19.2.6", Te;
}
var Qd;
function Mv() {
  if (Qd) return gf.exports;
  Qd = 1;
  function o() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(o);
      } catch (v) {
        console.error(v);
      }
  }
  return o(), gf.exports = Ov(), gf.exports;
}
var Zd = Mv(), Of = Uf();
function Kn(o, v, S) {
  return `[${(/* @__PURE__ */ new Date()).toISOString().slice(11, 23)}] [${o.toUpperCase()}] [${v}] ${S}`;
}
function Dv(o) {
  return {
    debug(v, ...S) {
      console.debug(Kn("debug", o.name, v), ...S);
    },
    info(v, ...S) {
      console.log(Kn("info", o.name, v), ...S);
    },
    warn(v, ...S) {
      console.warn(Kn("warn", o.name, v), ...S);
    },
    error(v, ...S) {
      console.error(Kn("error", o.name, v), ...S);
    },
    printBanner() {
      console.log(
        `%c  🔆 Lux v${o.version}  %c 英雄联盟智能选人推荐 `,
        "background:#f0c040;color:#000;font-weight:bold;padding:4px 8px;",
        "background:#333;color:#fff;padding:4px 8px;"
      );
    }
  };
}
const Ld = {
  GAMEFLOW_PHASE_CHANGE: "/lol-gameflow/v1/gameflow-phase",
  CHAMP_SELECT_SESSION: "/lol-champ-select/v1/session"
};
class Uv {
  constructor() {
    $t(this, "eventListeners", /* @__PURE__ */ new Map());
    $t(this, "observedUris", /* @__PURE__ */ new Set());
    $t(this, "penguContext", null);
  }
  bindContext(v) {
    this.penguContext = v;
    const S = Array.from(this.eventListeners.keys());
    this.observedUris.clear(), S.forEach((f) => this.observeUriOnSocket(f));
  }
  observeUriOnSocket(v) {
    !this.penguContext || this.observedUris.has(v) || (this.observedUris.add(v), this.penguContext.socket.observe(v, (S) => {
      var R;
      const f = S;
      (R = this.eventListeners.get(v)) == null || R.forEach((X) => X(f));
    }));
  }
  observe(v, S) {
    let f = this.eventListeners.get(v);
    return f || (f = /* @__PURE__ */ new Set(), this.eventListeners.set(v, f)), f.add(S), this.observeUriOnSocket(v), () => {
      f == null || f.delete(S), (f == null ? void 0 : f.size) === 0 && this.eventListeners.delete(v);
    };
  }
  // --- REST API ---
  async request(v, S = {}) {
    const f = v.startsWith("/") ? v : `/${v}`, R = await fetch(f, {
      ...S,
      headers: { "Content-Type": "application/json", Accept: "application/json", ...S.headers }
    });
    if (!R.ok) throw new Error(`[LCU] ${S.method ?? "GET"} ${f} → ${R.status}`);
    if (R.status !== 204)
      return R.json();
  }
  // --- Champ Select ---
  getChampSelectSession() {
    return this.request("/lol-champ-select/v1/session");
  }
  getPickableChampionIds() {
    return this.request("/lol-champ-select/v1/pickable-champion-ids");
  }
  getSummonerInfo() {
    return this.request("/lol-summoner/v1/current-summoner");
  }
}
const $n = new Uv(), Tf = {
  championRecommendation: !0
};
class Nv {
  constructor() {
    $t(this, "cache");
    $t(this, "listeners", /* @__PURE__ */ new Map());
    this.cache = { ...Tf };
  }
  get(v) {
    const S = DataStore.get(`lux.${v}`);
    return S !== void 0 ? S : Tf[v];
  }
  set(v, S) {
    var f;
    this.cache[v] = S, DataStore.set(`lux.${v}`, S), (f = this.listeners.get(v)) == null || f.forEach((R) => R(S));
  }
  onChange(v, S) {
    let f = this.listeners.get(v);
    return f || (f = /* @__PURE__ */ new Set(), this.listeners.set(v, f)), f.add(S), () => f.delete(S);
  }
  load() {
    for (const v of Object.keys(Tf))
      this.cache[v] = this.get(v);
  }
}
const Hv = new Nv();
class Cv {
  constructor() {
    $t(this, "tasks", /* @__PURE__ */ new Set());
    $t(this, "observer", null);
    $t(this, "isThrottled", !1);
  }
  register(v) {
    this.tasks.add(v);
    try {
      v();
    } catch {
    }
  }
  unregister(v) {
    this.tasks.delete(v);
  }
  start() {
    this.observer || (this.observer = new MutationObserver(() => {
      this.isThrottled || (this.isThrottled = !0, requestAnimationFrame(() => {
        for (const v of this.tasks)
          try {
            v();
          } catch {
          }
        this.isThrottled = !1;
      }));
    }), this.observer.observe(document.body, { childList: !0, subtree: !0 }));
  }
  stop() {
    var v;
    (v = this.observer) == null || v.disconnect(), this.observer = null;
  }
}
const Za = new Cv(), kn = "https://lol-api-champion.op.gg", Nf = "cn";
async function Hf(o, v) {
  const S = new AbortController(), f = setTimeout(() => S.abort(), v);
  try {
    return await fetch(o, {
      signal: S.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Lux/1.0",
        Origin: kn
      }
    });
  } finally {
    clearTimeout(f);
  }
}
async function Rv(o, v) {
  try {
    const S = `${kn}/champions/${o}/counters?region=${Nf}&position=${v}`, f = await Hf(S, 3e3);
    if (!f.ok) throw new Error(`OP.GG counter API returned ${f.status}`);
    return f.json();
  } catch {
    return [];
  }
}
async function xv(o, v) {
  try {
    const S = `${kn}/champions/${o}/synergies?region=${Nf}&position=${v}`, f = await Hf(S, 3e3);
    if (!f.ok) throw new Error(`OP.GG synergy API returned ${f.status}`);
    return f.json();
  } catch {
    return [];
  }
}
async function qv() {
  try {
    const o = `${kn}/tiers?region=${Nf}`, v = await Hf(o, 3e3);
    if (!v.ok) throw new Error(`OP.GG tier API returned ${v.status}`);
    return v.json();
  } catch {
    return [];
  }
}
const pf = {
  getCounters: Rv,
  getSynergies: xv,
  getTierList: qv
}, Bv = {}, Yv = {}, Wd = {
  counters: Bv,
  synergies: Yv
}, jv = Wd.counters ?? {}, Gv = Wd.synergies ?? {};
function Xv(o, v) {
  const S = jv[String(v)];
  return S != null && S.includes(o) ? 80 : 50;
}
function Qv(o, v) {
  const S = Gv[String(v)];
  return S != null && S.includes(o) ? 80 : 50;
}
function Zv(o) {
  return 50;
}
function Lv(o, v, S) {
  let f = 0, R = 0;
  for (const O of v)
    (S[String(O)] ?? "ad") === "ap" ? f++ : R++;
  (S[String(o)] ?? "ad") === "ap" ? f++ : R++;
  const j = f + R;
  if (j === 0) return 50;
  const U = f / j;
  return U >= 0.4 && U <= 0.6 ? 100 : U === 1 || U === 0 ? 30 : 65;
}
function Vv(o, v) {
  const S = o.find((f) => f.opponentChampionId === v);
  return S ? S.winRate : null;
}
function Kv(o, v) {
  const S = o.find((f) => f.allyChampionId === v);
  return S ? S.winRate : null;
}
function Jv(o, v, S, f, R, X) {
  const j = [];
  for (const U of o.availableIds) {
    if (o.allyPicks.includes(U) || o.enemyPicks.includes(U) || o.bannedIds.includes(U)) continue;
    let O = 0, p = 0, V = 0;
    if (X) {
      const zl = v.get(U), Nl = S.get(U), Ml = f.get(U);
      for (const Xl of o.allyPicks) {
        const _l = Nl ? Kv(Nl, Xl) : null;
        O += _l !== null ? _l * 100 : 50;
      }
      O = o.allyPicks.length > 0 ? O / o.allyPicks.length : 50;
      for (const Xl of o.enemyPicks) {
        const _l = zl ? Vv(zl, Xl) : null;
        p += _l !== null ? _l * 100 : 50;
      }
      p = o.enemyPicks.length > 0 ? p / o.enemyPicks.length : 50, Ml ? V = { Tier1: 95, Tier2: 80, Tier3: 60, Tier4: 40, Tier5: 20, OP: 100 }[Ml.tier] ?? 50 : V = 50;
    } else {
      for (const zl of o.allyPicks)
        O += Qv(U, zl);
      O = o.allyPicks.length > 0 ? O / o.allyPicks.length : 50;
      for (const zl of o.enemyPicks)
        p += Xv(U, zl);
      p = o.enemyPicks.length > 0 ? p / o.enemyPicks.length : 50, V = Zv();
    }
    const q = Lv(U, o.allyPicks, R), fl = O * 0.35 + p * 0.35 + V * 0.2 + q * 0.1;
    j.push({
      championId: U,
      score: Math.round(fl),
      synergy: Math.round(O),
      counter: Math.round(p),
      meta: Math.round(V),
      balance: Math.round(q),
      tier: wv(fl)
    });
  }
  return j.sort((U, O) => O.score - U.score), j;
}
function wv(o) {
  return o >= 80 ? "strong" : o >= 65 ? "good" : o >= 45 ? "neutral" : o >= 30 ? "weak" : "avoid";
}
function $v(o, v) {
  let S = null;
  return (...f) => {
    S && clearTimeout(S), S = setTimeout(() => {
      S = null, o(...f);
    }, v);
  };
}
const Wv = { 1: { name: "黑暗之女", enName: "Annie", positions: ["mid", "utility"] }, 2: { name: "狂战士", enName: "Olaf", positions: ["top", "jungle"] }, 3: { name: "正义巨像", enName: "Galio", positions: ["mid", "utility"] } }, kv = { top: "上路", jungle: "打野", mid: "中路", bot: "下路", utility: "辅助" }, Fv = { 1: "ap", 2: "ad", 3: "ap" }, kd = {
  champions: Wv,
  positionLabels: kv,
  damageTypes: Fv
}, Iv = kd;
let Ea = null, Jn = null, wn = null;
function Pv(o) {
  Jn = o;
}
function lh(o) {
  wn = o;
}
function th(o, v) {
  const S = o.myTeam.filter((U) => U.championId > 0).map((U) => U.championId), f = o.theirTeam.filter((U) => U.championId > 0).map((U) => U.championId), R = o.bans.myTeamBans ?? [], X = o.bans.theirTeamBans ?? [], j = o.myTeam.find((U) => U.cellId === o.localPlayerCellId);
  return {
    allyPicks: S,
    enemyPicks: f,
    allyBans: R,
    enemyBans: X,
    bannedIds: [.../* @__PURE__ */ new Set([...R, ...X])],
    availableIds: v.filter((U) => !S.includes(U) && !f.includes(U)),
    assignedPosition: (j == null ? void 0 : j.assignedPosition) ?? "",
    queueId: o.queueId
  };
}
async function ah(o, v) {
  try {
    const S = await pf.getTierList(), f = /* @__PURE__ */ new Map(), R = /* @__PURE__ */ new Map(), X = await Promise.all(
      o.slice(0, 15).map(async (U) => {
        const [O, p] = await Promise.all([
          pf.getCounters(U, v),
          pf.getSynergies(U, v)
        ]);
        f.set(U, O), R.set(U, p);
      })
    ), j = /* @__PURE__ */ new Map();
    return S.forEach((U) => j.set(U.championId, U)), { counters: f, synergies: R, tiers: j, useOpgg: !0 };
  } catch {
    return { counters: /* @__PURE__ */ new Map(), synergies: /* @__PURE__ */ new Map(), tiers: /* @__PURE__ */ new Map(), useOpgg: !1 };
  }
}
const uh = $v(async (o) => {
  if (o.timer.phase !== "BAN_PICK" && o.timer.phase !== "PLANNING" || (Ea == null ? void 0 : Ea.sessionId) === o.id && (Ea == null ? void 0 : Ea.scores.length) > 0) return;
  const v = await $n.getPickableChampionIds().catch(() => []);
  if (v.length === 0) return;
  const S = th(o, v), f = S.assignedPosition, R = S.availableIds.slice(0, 20), { counters: X, synergies: j, tiers: U, useOpgg: O } = await ah(R, f), p = Jv(
    S,
    X,
    j,
    U,
    Iv.damageTypes,
    O
  );
  Ea = { sessionId: o.id, scores: p, useOpgg: O, timestamp: Date.now() };
  const V = o.timer.phase === "BAN_PICK";
  Jn == null || Jn(V ? p : [], O, f);
}, 500);
function eh() {
  Ea = null, wn == null || wn();
}
function nh() {
  $n.observe(
    Ld.CHAMP_SELECT_SESSION,
    (o) => {
      const v = o.data;
      !v || !v.myTeam || !v.theirTeam || uh(v);
    }
  ), $n.observe(
    Ld.GAMEFLOW_PHASE_CHANGE,
    (o) => {
      o.data !== "ChampSelect" && eh();
    }
  );
}
function ih(o) {
  const v = o.getAttribute("data-champion-id");
  if (v) return parseInt(v, 10);
  const f = (o.getAttribute("src") ?? "").match(/champion[_-](\d+)/i);
  return f ? parseInt(f[1], 10) : null;
}
function ch(o, v) {
  const S = document.createElement("div");
  if (S.className = "lux-badge", o.tier === "strong")
    S.style.cssText = `
      position: absolute; top: -4px; right: -4px;
      width: 24px; height: 24px;
      background: #e84057; color: #fff;
      border-radius: 50%; font-size: 11px;
      font-weight: bold; line-height: 24px; text-align: center;
      z-index: 100; pointer-events: none;
      box-shadow: 0 0 6px rgba(232,64,87,0.6);
    `;
  else if (o.tier === "good")
    S.style.cssText = `
      position: absolute; top: -4px; right: -4px;
      width: 20px; height: 20px;
      background: #2ecc71; color: #fff;
      border-radius: 50%; font-size: 10px;
      font-weight: bold; line-height: 20px; text-align: center;
      z-index: 100; pointer-events: none;
    `;
  else if (o.tier === "weak" || o.tier === "avoid")
    S.style.cssText = `
      position: absolute; top: -4px; right: -4px;
      width: 20px; height: 20px;
      background: rgba(0,0,0,0.5); color: #999;
      border-radius: 50%; font-size: 10px;
      font-weight: bold; line-height: 20px; text-align: center;
      z-index: 100; pointer-events: none;
    `;
  else
    return S;
  return v || (S.style.background = "#888"), S.textContent = String(o.score), S.title = [
    `综合: ${o.score}`,
    `协同: ${o.synergy}`,
    `克制: ${o.counter}`,
    `强度: ${o.meta}`,
    `平衡: ${o.balance}`,
    v ? "(OP.GG数据)" : "(本地数据)"
  ].join(`
`), S;
}
function fh(o, v) {
  const S = new Map(o.map((f) => [f.championId, f]));
  return () => {
    const f = document.querySelectorAll(
      '[data-champion-id], .champion-icon, [class*="champion"] img'
    );
    let R = 0;
    return f.forEach((X) => {
      const j = ih(X);
      if (!j) return;
      const U = S.get(j);
      if (!U || X.querySelector(".lux-badge")) return;
      const O = ch(U, v);
      O.children.length === 0 && !O.textContent || (X.style.position = "relative", X.appendChild(O), R++);
    }), R > 0;
  };
}
function sh(o) {
  const v = document.querySelector(`[data-champion-id="${o}"]`);
  if (v) return v;
  const S = document.querySelectorAll('[class*="champion"] img');
  for (const f of S)
    if (f.src.includes(`champion/${o}`) || f.src.includes(`champion_${o}`))
      return f.closest('[class*="champion"]') ?? f;
  return null;
}
function oh(o, v) {
  return () => {
    const S = sh(o.championId);
    if (!S || S.hasAttribute("data-lux-highlighted")) return !0;
    const f = o.tier === "strong" ? "#e84057" : "#2ecc71";
    return S.style.boxShadow = `0 0 8px ${f}, inset 0 0 0 2px ${f}`, S.style.borderRadius = "4px", S.setAttribute("data-lux-highlighted", "true"), !0;
  };
}
var Af = { exports: {} }, pe = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Vd;
function dh() {
  if (Vd) return pe;
  Vd = 1;
  var o = Symbol.for("react.transitional.element"), v = Symbol.for("react.fragment");
  function S(f, R, X) {
    var j = null;
    if (X !== void 0 && (j = "" + X), R.key !== void 0 && (j = "" + R.key), "key" in R) {
      X = {};
      for (var U in R)
        U !== "key" && (X[U] = R[U]);
    } else X = R;
    return R = X.ref, {
      $$typeof: o,
      type: f,
      key: j,
      ref: R !== void 0 ? R : null,
      props: X
    };
  }
  return pe.Fragment = v, pe.jsx = S, pe.jsxs = S, pe;
}
var Kd;
function yh() {
  return Kd || (Kd = 1, Af.exports = dh()), Af.exports;
}
var vl = yh(), mh = $d();
const Fn = kd;
function vh({ scores: o, assignedPosition: v, useOpgg: S, visible: f, onClose: R }) {
  if (!f) return null;
  const X = rh(o, v);
  return mh.createPortal(
    /* @__PURE__ */ vl.jsxs("div", { id: "lux-recommendation-panel", style: {
      position: "fixed",
      right: 0,
      top: "10%",
      width: "320px",
      maxHeight: "80%",
      background: "rgba(20,20,30,0.95)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "8px 0 0 8px",
      color: "#cdd6f4",
      zIndex: 9999,
      overflow: "auto",
      padding: "16px",
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px"
    }, children: [
      /* @__PURE__ */ vl.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }, children: [
        /* @__PURE__ */ vl.jsxs("h3", { style: { margin: 0, fontSize: "16px", color: "#f0c040" }, children: [
          "Lux 推荐",
          !S && /* @__PURE__ */ vl.jsx("span", { style: { fontSize: "11px", color: "#888", marginLeft: "8px" }, children: "(本地数据)" })
        ] }),
        /* @__PURE__ */ vl.jsx("button", { onClick: R, style: {
          background: "none",
          border: "none",
          color: "#888",
          cursor: "pointer",
          fontSize: "18px"
        }, children: "x" })
      ] }),
      /* @__PURE__ */ vl.jsx(_f, { title: "推荐位", children: X.recommended.slice(0, 3).map((j) => /* @__PURE__ */ vl.jsx(Jd, { score: j }, j.championId)) }),
      /* @__PURE__ */ vl.jsx(_f, { title: "各位置速览", children: Object.entries(X.byPosition).map(([j, U]) => {
        const O = U[0];
        return O ? /* @__PURE__ */ vl.jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }, children: [
          /* @__PURE__ */ vl.jsx("span", { style: { color: "#888", minWidth: "32px", fontSize: "12px" }, children: Fn.positionLabels[j] ?? j }),
          /* @__PURE__ */ vl.jsx(Jd, { score: O, compact: !0 })
        ] }, j) : null;
      }) }),
      /* @__PURE__ */ vl.jsx(_f, { title: "阵容分析", children: /* @__PURE__ */ vl.jsx(hh, { scores: o }) })
    ] }),
    document.body
  );
}
function _f({ title: o, children: v }) {
  return /* @__PURE__ */ vl.jsxs("div", { style: { marginBottom: "12px" }, children: [
    /* @__PURE__ */ vl.jsx("h4", { style: { margin: "0 0 6px 0", fontSize: "13px", color: "#a6adc8" }, children: o }),
    v
  ] });
}
function Jd({ score: o, compact: v = !1 }) {
  const S = Fn.champions[String(o.championId)], f = (S == null ? void 0 : S.name) ?? `英雄 #${o.championId}`;
  return /* @__PURE__ */ vl.jsxs("div", { style: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: v ? "2px 0" : "6px 8px",
    background: v ? "none" : "rgba(255,255,255,0.05)",
    borderRadius: "4px",
    marginBottom: v ? 0 : "4px"
  }, children: [
    /* @__PURE__ */ vl.jsx("span", { style: {
      width: v ? "20px" : "28px",
      height: v ? "20px" : "28px",
      background: "#e84057",
      borderRadius: "50%",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: v ? "10px" : "12px",
      fontWeight: "bold",
      color: "#fff",
      flexShrink: 0
    }, children: o.score }),
    /* @__PURE__ */ vl.jsx("span", { style: { flex: 1, fontWeight: v ? "normal" : "600" }, children: f }),
    !v && /* @__PURE__ */ vl.jsxs("span", { style: { fontSize: "11px", color: "#888" }, children: [
      "协",
      o.synergy,
      " | ",
      "克",
      o.counter,
      " | ",
      "强",
      o.meta
    ] })
  ] });
}
function hh({ scores: o }) {
  const v = o.slice(0, 5), S = v.filter((R) => Fn.damageTypes[String(R.championId)] === "ap").length, f = v.length - S;
  return /* @__PURE__ */ vl.jsxs("div", { style: { fontSize: "11px", color: "#888", lineHeight: 1.6 }, children: [
    /* @__PURE__ */ vl.jsxs("div", { children: [
      "Top 5 推荐中: AP ",
      S,
      " | AD ",
      f
    ] }),
    S === 0 ? /* @__PURE__ */ vl.jsx("div", { style: { color: "#f38ba8" }, children: " 无 AP 选择，阵容可能缺法伤" }) : null,
    f === 0 ? /* @__PURE__ */ vl.jsx("div", { style: { color: "#f38ba8" }, children: " 无 AD 选择，阵容可能缺物伤" }) : null
  ] });
}
function rh(o, v) {
  const S = {};
  for (const R of o) {
    const X = Fn.champions[String(R.championId)], j = (X == null ? void 0 : X.positions) ?? [];
    for (const U of j)
      S[U] || (S[U] = []), S[U].push(R);
  }
  return { recommended: v && S[v] ? S[v] : o, byPosition: S };
}
const gh = "Lux", Sh = "0.1.0", wd = "lux-root", Mf = Dv({ name: gh, version: Sh });
function bh() {
  return window.__LUX_RUNTIME__ || (window.__LUX_RUNTIME__ = { container: null, root: null }), window.__LUX_RUNTIME__;
}
let Df = null, Ae = null, Du = null, _e = [];
function Wn(o, v, S, f) {
  !Df || !Ae || Df.render(
    Of.createElement(vh, {
      scores: o,
      assignedPosition: S,
      useOpgg: v,
      visible: f,
      onClose: () => Wn(o, v, S, !1)
    })
  );
}
function zh(o, v) {
  if (Du && Za.unregister(Du), _e.forEach((f) => Za.unregister(f)), _e = [], o.length === 0) return;
  Du = fh(o, v), Za.register(Du);
  const S = o.slice(0, 3);
  for (const f of S) {
    const R = oh(f);
    _e.push(R), Za.register(R);
  }
}
function ph(o) {
  $n.bindContext(o), Mf.printBanner();
}
function Ah() {
  Mf.info("Plugin loading..."), Hv.load(), nh(), Pv((o, v, S) => {
    zh(o, v), Wn(o, v, S, o.length > 0);
  }), lh(() => {
    Du && Za.unregister(Du), _e.forEach((o) => Za.unregister(o)), _e = [], Wn([], !1, "", !1);
  }), Za.start(), Eh(), document.addEventListener("keydown", (o) => {
    if (o.key === "F3" && !o.ctrlKey && !o.altKey && !o.metaKey) {
      o.preventDefault();
      const v = document.getElementById("lux-panel-root");
      if (v) {
        const S = v.style.display !== "none";
        v.style.display = S ? "none" : "block";
      }
    }
  }), Mf.info("Lux loaded");
}
function Eh() {
  const o = bh();
  let v = document.getElementById(wd);
  v || (v = document.createElement("div"), v.id = wd, document.body.appendChild(v)), o.container = v, o.root ? o.root.render(Of.createElement("div", { style: { display: "none" } })) : (o.root = Zd.createRoot(v), o.root.render(Of.createElement("div", { style: { display: "none" } }))), Ae = document.createElement("div"), Ae.id = "lux-panel-root", document.body.appendChild(Ae), Df = Zd.createRoot(Ae), Wn([], !1, "", !1);
}
export {
  ph as init,
  Ah as load,
  Mf as logger
};
