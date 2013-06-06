var utils = {
	// divers
	rand: function(n) { return Math.floor(Math.random()*n); },
	randBtw: function(a, b) { return a + this.rand(b-a); },
	clamp: function(val, min, max) { return (val < min)? min : ((val > max)? max : val); },
	isBtw: function(val, min, max) { return val >= min && val <= max; },
	randInArr: function(arr) { if (!arr.length) return null; return arr[utils.rand(arr.length)]; },
    isOfType: function(obj, type) { var clas = Object.prototype.toString.call(obj).slice(8, -1); return obj !== undefined && obj !== null && clas === type; },
	diviseurs: function(n) { var ans = []; for (var i=2; i<=Math.ceil(Math.sqrt(n)) && n!=1; i++) if (n%i == 0){ n/=i; ans.push(i--); } ans.push(n); return ans; },
    
    // ex: replaceArgs("Salut je m'appelle %prenom%, j'ai %age% ans.", {prenom:"Hugo", age:19});
    replaceArgs: function(str, props) {
        var i, len = str.length;
        var readingArgName = false;
        var argName = "", outputStr = "";
        
        for (i=0; i<len; i++)
        {
            var ch = str.charAt(i);
            
            if (ch == '%')
            {
                if (readingArgName) {
                    if (props && props.hasOwnProperty(argName))
                        outputStr += props[argName];
                    else
                        outputStr += "%"+argName+"%";
                }
                else
                    argName = "";
                
                readingArgName = !readingArgName;
            }
            else if (readingArgName) {
                argName += ch;
            }
            else
                outputStr += ch;
        }
        
        return outputStr;
    },
	
	// geom
	Point: function(x, y) { this.x=x, this.y=y; },
	Rect: function(x, y, w, h) { this.x=x, this.y=y, this.w=w, this.h=h; },
	
	// tween
	Tween: (function(){
		var _this = new Object();

		_this.start = function(o,props,durationSecs,onComplete,easef,onTick){
			var fps=40,count=0,stopAt = fps*durationSecs,startVals={},endVals={},easef=easef||_this.quadOut;
			for (var p in props) startVals[p] = o[p];
			for (var p in props) endVals[p] = props[p];
			var tween_id = "_tween_id";
			var f=function(){
				count++;
				if (count>=stopAt){
					clearInterval(o[tween_id]);
					delete o[tween_id];
					for (var p in endVals) o[p] = endVals[p];
					if (onComplete) onComplete();
				} else {
					for (var p in props) o[p] = easef(count,startVals[p],endVals[p]-startVals[p],stopAt);
				}
				
				if (onTick) onTick(o, count, stopAt);
			}
			clearInterval(o[tween_id]);
			o[tween_id] = setInterval(f,durationSecs*1000/fps);
			
			return tween_id;
		};

		_this.linear = function(t, b, c, d) { return c*t/d + b;};
		_this.quadIn = function(t, b, c, d) { return c*(t/=d)*t*t*t + b;};
		_this.quadOut = function(t, b, c, d) {	return -c * ((t=t/d-1)*t*t*t - 1) + b;}
		
		return _this;
	})()
};

// requestAnimationFrame
(function() {
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  window.requestAnimationFrame = requestAnimationFrame;
})();
