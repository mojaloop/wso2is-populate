{ nixpkgs ? import <nixpkgs> {  } }: nixpkgs.terraform_0_14

# let
#   pkgs = [
#     nixpkgs.nodejs
#   ];
#
# in
#   nixpkgs.stdenv.mkDerivation {
#     name = "env";
#     buildInputs = pkgs;
#   }
