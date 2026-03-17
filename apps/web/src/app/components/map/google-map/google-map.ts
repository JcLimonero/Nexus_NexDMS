import { AfterViewInit, Component, OnInit, ViewChild } from "@angular/core";
import { GoogleMap, GoogleMapsModule } from "@angular/google-maps";

interface IMapMarker {
  position: {
    lat: number;
    lng: number;
  };
  label?: {
    color?: string;
    text?: string;
  };
  labels?: google.maps.MarkerLabel;
  title?: string;
  options?: google.maps.MarkerOptions;
  Option?: {
    draggable?: boolean;
    animation?: google.maps.Animation;
    zoomControl?: boolean;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
  };
}

@Component({
  selector: "app-google-map",
  imports: [GoogleMapsModule],
  templateUrl: "./google-map.html",
  styleUrls: ["./google-map.scss"],
})
export class GoogleMaps implements OnInit, AfterViewInit {
  public markers: IMapMarker[];
  public markers1: IMapMarker[];
  public zoom: number;

  constructor() {
    this.markers = [];
    this.zoom = 2;
  }

  ngOnInit() {
    this.markers1.push({
      position: {
        lat: 12.97,
        lng: 77.59,
      },
      label: {
        color: "red",
        text: "Arial",
      },
      Option: {
        draggable: true,
        animation: google.maps.Animation.DROP,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      },
    });

    this.markers.push({
      position: {
        lat: 35.717,
        lng: 139.731,
      },
      label: {
        color: "black",
        text: "Madrid",
      },
      Option: {
        draggable: true,
        animation: google.maps.Animation.DROP,
      },
    });

    this.markers.push({
      position: {
        lat: 48.8615515,
        lng: 2.3112233,
      },
      label: {
        color: "black",
        text: "Paris",
      },
    });
  }

  //Street View
  @ViewChild(GoogleMap) map!: GoogleMap;

  ngAfterViewInit() {
    const streetView = this.map.getStreetView();
    streetView.setOptions({
      position: { lat: 38.9938386, lng: -77.2515373 },
      pov: { heading: 70, pitch: -10 },
    });
    streetView.setVisible(true);
    const bounds = this.getBounds(this.markers);
    this.map.googleMap?.fitBounds(bounds);
  }

  getBounds(markers: IMapMarker[]): google.maps.LatLngBoundsLiteral {
    if (!markers.length) {
      // Fallback bounds or throw error
      return {
        north: 0,
        south: 0,
        east: 0,
        west: 0,
      };
    }

    let north = markers[0].position.lat;
    let south = markers[0].position.lat;
    let east = markers[0].position.lng;
    let west = markers[0].position.lng;

    for (const marker of markers) {
      north = Math.max(north, marker.position.lat);
      south = Math.min(south, marker.position.lat);
      east = Math.max(east, marker.position.lng);
      west = Math.min(west, marker.position.lng);
    }

    return { north, south, east, west };
  }
}
