import { Component, ViewChild, ElementRef } from '@angular/core';
import { Plugins} from '@capacitor/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { AngularFirestoreCollection, AngularFirestore } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';
const { Geolocation } = Plugins;
declare var google;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  locations: Observable<any>;
  locationsCollection: AngularFirestoreCollection<any>;
  user = null;
  isTracking = false;
  watch = null;
  @ViewChild('map', {static: true}) mapElement: ElementRef;
  map: any;
  markers = [];

  constructor(
    private afAuth: AngularFireAuth,
    private aFS: AngularFirestore
  ) {
    this.anonLogin();
  }

  ionViewWillEnter() {
    this.loadMap();
  }


  loadMap() {
    const latLng = new google.maps.LatLng(0, 0);
    const mapOptions = {
      center: latLng,
      zoom: 5,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
  }

  anonLogin() {
    this.afAuth.auth.signInAnonymously().then( res => {
      console.log('user', res.user);
      this.user = res.user;

      this.locationsCollection = this.aFS.collection(
        `locations/${ this.user.uid }/track`,
        ref => ref.orderBy('timestamp')
      );

      this.locations = this.locationsCollection.snapshotChanges().pipe(
        map(actions =>  actions.map(a => {
          const data = a.payload.doc.data();
          const id = a.payload.doc.id;
          return { id, ... data };
        }) )
      );

      this.locations.subscribe( () => {

      });

    });
  }

  startTracking() {
    this.isTracking = true;
    this.watch = Geolocation.watchPosition({}, (position: any, err) => {
      console.log('position:', position);
      this.addNewPosition(
        position.coords.latitude,
        position.coords.longitude,
        position.timestamp
      );
    });
  }

  stopTracking() {
    Geolocation.clearWatch({id: this.watch}).then( () => {
      this.isTracking = false;
    });
  }

  addNewPosition(lat: number, lng: number , timestamp) {
    this.locationsCollection.add({
      lat,
      lng,
      timestamp
    });

    const position = new google.maps.LatLng(lat, lng);
    this.map.setCenter(position);
    this.map.setZoom(15);
  }

  deleteLocation(pos) {
    // console.log('position', pos);
    this.locationsCollection.doc(pos.id).delete();
  }
}
