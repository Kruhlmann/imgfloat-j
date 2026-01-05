{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  packages = [
    pkgs.electron
    pkgs.jdt-language-server
    pkgs.maven
    pkgs.nodePackages.prettier
    pkgs.nodejs
    pkgs.nss
    pkgs.openbox
    pkgs.openjdk
    pkgs.xorg.xorgserver
  ];
}
