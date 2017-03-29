all: starfield_min.js webglstarfield

clean:
	rm starfield_min.js

starfield_min.js: starfield.js externs.js
	closure-compiler --compilation_level ADVANCED_OPTIMIZATIONS --js starfield.js --externs externs.js > starfield_min.js

webglstarfield: starfield_min.js
	cp starfield_min.js webglstarfield/
	cp bg.png webglstarfield/

.PHONY: webglstarfield
