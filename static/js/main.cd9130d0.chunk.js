(this.webpackJsonpjothello=this.webpackJsonpjothello||[]).push([[0],{10:function(e,t,n){},4:function(e,t,n){e.exports=n(5)},5:function(e,t,n){"use strict";n.r(t);var a,r=n(1),c=n(0),o=n.n(c),l=n(3),u=n.n(l);n(10);function i(e){return e===a.HUMAN?"\ud83d\udc4d":e===a.BOT?"\ud83e\udd16":""}function f(e,t,n,r,c,o){t+=r,n+=c;for(var l=!1;t>=0&&t<e[0].length&&n>=0&&n<e.length;){if(console.log("".concat(r," ").concat(c),i(e[n][t])),e[n][t]===a.FREE)return!1;if(e[n][t]===o)return l;l=!0,t+=r,n+=c}return!1}function s(e){return o.a.createElement("td",{className:"square",onClick:function(){return e.onClick(e.x,e.y)}},i(e.value))}function m(e){var t=function(t,n){e.handleBoardClick(t,n)};return o.a.createElement("div",null,o.a.createElement("table",null,o.a.createElement("tbody",null,e.boardArray.map((function(e,n){return o.a.createElement("tr",{key:n,className:"board-row"},e.map((function(e,a){return o.a.createElement(s,{key:"".concat(a," ").concat(n),value:e,onClick:t,x:a,y:n})})))})))))}function E(){var e=Object(c.useState)(!0),t=Object(r.a)(e,2),n=t[0],l=t[1],u=Object(c.useState)(function(e,t){for(var n=[],r=0;r<t;++r){var c=Array(e).fill(a.FREE);n.push(c)}var o=Math.floor(e/2),l=Math.floor(t/2);return n[l][o]=a.BOT,n[l][o-1]=a.HUMAN,n[l-1][o]=a.HUMAN,n[l-1][o-1]=a.BOT,n}(8,8)),s=Object(r.a)(u,2),E=s[0],d=s[1],v=n?a.HUMAN:a.BOT,N="Next player: ".concat(i(v));return o.a.createElement("div",{className:"game"},o.a.createElement("div",{className:"status"},N),o.a.createElement("div",{className:"game-board"},o.a.createElement(m,{isHumanNext:n,handleBoardClick:function(e,t){(function(e,t,n,r){if(e[n][t]!==a.FREE)return!1;for(var c=!1,o=-1;o<=1;++o)for(var l=-1;l<=1;++l)c=c||f(e,t,n,o,l,r);return c})(E,e,t,v)&&(l(!n),d(E.map((function(n,a){return n.map((function(n,r){return a===t&&r===e?v:n}))}))))},boardArray:E})))}!function(e){e[e.HUMAN=0]="HUMAN",e[e.BOT=1]="BOT",e[e.FREE=2]="FREE"}(a||(a={})),u.a.render(o.a.createElement(E,null),document.getElementById("root"))}},[[4,1,2]]]);
//# sourceMappingURL=main.cd9130d0.chunk.js.map