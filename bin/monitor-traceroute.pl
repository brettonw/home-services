#! /usr/bin/env perl

use strict;
use warnings;

# this program will periodically run traceroute on a series of hosts, and will output the
# lowest common denominator route that is always taken (the ISP)

my $maxHops = 8;

my $targetHosts = [
    "1.1.1.1",
    "microsoft.com",
    "amazon.com",
    "banctec.ca",
    "r18.com",
    "netflix.com",
    "google.com",
    "apple.com",
    "nih.gov",
    "youtube.com",
    "baltimorecity.gov",
    "jhu.edu"
];

my $routeHosts = [];

sub gatherRouteHost {
    my ($line, $expectedIndex, $index, $ip) = @_;
    if ($index == $expectedIndex) {
        print STDERR "$index $ip [$line]\n";
        $expectedIndex++;


    } else {
        print STDERR "UNEXPECTED INDEX ($index) WHEN EXPECTING ($expectedIndex). [$line]\n";
    }
    return $expectedIndex;
}

while (1) {
    for my $targetHost (@$targetHosts) {
        # traceroute gives output for lines we care about will have the form:
        # " 3  24.124.180.217  9.795 ms  9.270 ms  10.184 ms"
        my $expectedIndex = 1;
        for my $line (split (/^/, `traceroute -n -m $maxHops -z 0.1 $targetHost`)) {
            chomp $line;
            if ($line =~ /^\s+(\d)\s+(\d+\.\d+\.\d+\.\d+)(\s+(\d+\.\d+\s+ms|\*)){3}$/) {
                $expectedIndex = gatherRouteHost ($line, $expectedIndex, $1, $2);
            } elsif ($line =~ /^\s+(\d)\s+(\*\s+)+(\d+\.\d+\.\d+\.\d+)(\s+(\d+\.\d+\s+ms|\*)){2,}$/) {
                $expectedIndex = gatherRouteHost ($line, $expectedIndex, $1, $3);
            } else {
                print STDERR ("BAD LINE. [$line]\n");
            }
        }
        print STDERR "\n";
    }
    exit ();
}
