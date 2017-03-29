all: webglstarfield

clean:
	rm starfield_min.js

starfield_min.js: starfield.js externs.js Makefile
	closure-compiler --compilation_level ADVANCED --js starfield.js --externs externs.js > starfield_min.js

webglstarfield: starfield_min.js Makefile
	cp starfield_min.js webglstarfield/
	cp bg.png webglstarfield/

.PHONY: webglstarfield clean all
