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
        #print STDERR "$index $ip [$line]\n";
        print STDERR "  $index $ip\n";
        $expectedIndex++;

        # vivify the hash reference
        if (! exists ($routeHosts->[$index])) {
            $routeHosts->[$index] = {};
        }
        my $hashRef = $routeHosts->[$index];

        # increment the count of the number of times we've seen this ip
        $hashRef->{$ip} = exists ($hashRef->{$ip}) ? ($hashRef->{$ip} + 1) : 0;
    } else {
        #print STDERR "UNEXPECTED INDEX ($index) WHEN EXPECTING ($expectedIndex). [$line]\n";
    }
    return $expectedIndex;
}

sub getRouteHostCount {
    my ($index) = @_;
    my $hashRef = $routeHosts->[$index];
    my $routeHost = (keys (%$hashRef))[0];
    return $hashRef->{$routeHost};
}

sub scrubRouteHosts {
    # adjust the maxHops value. start by getting the expected count from the first route host, which is our router
    print STDERR "Common hosts in routes:\n";
    my $expectedCount = getRouteHostCount (1);
    for (my $i = 1; $i < scalar (@$routeHosts); $i++) {
        if (exists ($routeHosts->[$i])) {
            # print everything in this reference
            my $hashRef = $routeHosts->[$i];

            if (scalar(%$hashRef) == 1) {
                my $routeHost = (keys (%$hashRef))[0];
                my $routeHostCount = $hashRef->{$routeHost};
                if ($routeHostCount == $expectedCount) {
                    print STDERR "  $i $routeHost\n";
                    $maxHops = $i;
                } else {
                    #print STDERR "RouteHousts at index ($i) has exactly one host, but does not match the expected count ($routeHostCount -> $expectedCount).\n";
                    last;
                }
            } else {
                #print STDERR "RouteHousts at index ($i) doesn't have exactly one host\n";
                last;
            }
        } else {
            #print STDERR "Empty RouteHousts at index ($i)\n";
            last;
        }
    }
    print STDERR "\nAdjusting maxHops to $maxHops\n\n";
}

while (1) {
    for my $targetHost (@$targetHosts) {
        # traceroute gives output for lines we care about will have the form:
        # " 3  24.124.180.217  9.795 ms  9.270 ms  10.184 ms"
        print STDERR "\nTARGET: $targetHost\n";
        my $expectedIndex = 1;
        for my $line (split (/^/, `traceroute -n -m $maxHops -z 100 $targetHost 2>&1`)) {
            chomp $line;
            if ($line =~ /^\s+(\d)\s+(\d+\.\d+\.\d+\.\d+)(\s+(\d+\.\d+\s+ms|\*)){3}$/) {
                $expectedIndex = gatherRouteHost ($line, $expectedIndex, $1, $2);
            } elsif ($line =~ /^\s+(\d)\s+(\*\s+)+(\d+\.\d+\.\d+\.\d+)(\s+(\d+\.\d+\s+ms|\*)){2,}$/) {
                $expectedIndex = gatherRouteHost ($line, $expectedIndex, $1, $3);
            } else {
                #print STDERR ("BAD LINE. [$line]\n");
            }
        }
    }

    # adjust the maxHops value, start by getting the expected count from the original host, which is certainly our router
    scrubRouteHosts ();

    print STDERR "\nSleeping for 20 minutes...\n";
    sleep (1200);
}
