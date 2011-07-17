all: starfield_min.js

clean:
	rm starfield_min.js

starfield_min.js: starfield.js externs.js
	java -jar ../griffeltavla/closure/compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --js starfield.js --externs externs.js > starfield_min.js
