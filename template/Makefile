SHELL := /bin/bash

.PHONY : clean build package

clean:
	rm -f functions/*-pkg.py
	rm -f *-build.yaml
	rm -f *-pkg.yaml
	rm -f main.yaml

build:
	python ./build/config_function.py
	python ./build/conformance_pack.py
	python ./build/stackset.py
	python ./build/template.py

package:
	rain pkg stackset-build.yaml --output stackset-pkg.yaml
	rain pkg template-build.yaml --output main.yaml
