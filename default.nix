{ nixpkgs ? import <nixpkgs> {  } }: [
    nixpkgs.terraform_0_14
    nixpkgs.python39Packages.jsonschema
    nixpkgs.jq
]
