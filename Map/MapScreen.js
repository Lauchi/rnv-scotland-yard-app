import React from 'react';
import {View, StyleSheet, Button, Text} from "react-native";
import {MapView} from "expo";
import {fetchMrX, fetchPoliceOfficers, fetchStations, postPlayerMove} from "../Backend/RestAdapter";
import TicketBuyFAB from "./TicketBuyFAB";
import DialogManager, {ScaleAnimation} from 'react-native-dialog-component';
import SelectStationDialog from "./SelectStationDialog";
import GetOutOfVehicleFAB from "./GetOutOfVehicleFAB";
import {getLocationAsync} from "../Location/LocationHelpers";

export default class MapScreen extends React.Component {
    static navigationOptions = ({
            header: null
        }
    );

    constructor(props) {
        super(props);
        const {gameSession, player} = this.props.navigation.state.params;
        this.state = {
            player: player,
            gameSession: gameSession,
            stations: [],
            mrX: null,
            policeOfficers: [],
            markersMapped: [],
            region: null
        }
    }

    onRegionChange(region) {
        this.setState({region: region});
    }

    async componentDidMount() {
        await this.loadMapElements();

        this.refs.map.fitToElements(true);
    }

    async loadMapElements() {
        const {player, gameSession} = this.state;

        let mrX = await fetchMrX(gameSession.id);
        let policeOfficers = await fetchPoliceOfficers(gameSession.id);

        this.setState({
            mrX: mrX,
            policeOfficers: policeOfficers,
            player: {
                ...player
            }
        });

        let playersMapped = this.mapPlayersAsMarkers();

        this.setState({
            markersMapped: playersMapped
        });

        this.refs.map.fitToElements(true);
    }

    render() {
        const {playerIsInVehicle, playerDrivingType} = this.state;
        return (
            <View style={styles.container}>
                <MapView ref="map"
                         style={styles.map}
                         onRegionChange={() => this.onRegionChange}>
                    {this.state.markersMapped}
                </MapView>

                <Button title={'Refresh'}
                        onPress={async () => await this.loadMapElements()}/>
                {(playerIsInVehicle) ? <GetOutOfVehicleFAB onItemPressed={() => this.openCompleteMovementDialog()}/> :
                    <TicketBuyFAB onItemPressed={(item) => this.openMovementDialogFor(item)}/>}

            </View>
        )
    }

    mapPlayersAsMarkers() {
        const {mrX, policeOfficers} = this.state;

        let markersMapped = policeOfficers
            .map(policeOfficer => (
                <MapView.Marker
                    key={policeOfficer.id}
                    pinColor={'#0044bb'}
                    coordinate={policeOfficer.currentLocation.geoLocation}
                    title={policeOfficer.name}
                    description={policeOfficer.currentLocation.name}
                />
            ));
        if (mrX) {
            let mrxMapped = [<MapView.Marker
                key={mrX.id}
                pinColor={'#222222'}
                coordinate={mrX.lastKnownLocation.geoLocation}
                title={mrX.lastKnownLocation.name}
            />];

            markersMapped = markersMapped.concat(mrxMapped);
        }

        return markersMapped;
    }

    mapStationssAsMarkers() {
        const {stations} = this.state;

        return stations.map(station => (
            <MapView.Marker
                key={station.id}
                coordinate={station.geoLocation}
                title={station.name}
            />
        ));
    }

    async openMovementDialogFor(type) {
        let stations = await this.getStationsNearToPlayer();
        //get stations
        DialogManager.show({
            title: 'Select Station for ' + type,
            titleAlign: 'center',
            animationDuration: 200,
            ScaleAnimation: new ScaleAnimation(),
            children: (
                <SelectStationDialog onStationPressed={(station) => this.startStationSelected(station, type)}
                                     selectableStations={stations}/>
            ),
        }, () => {});
    }

    startStationSelected(station, type) {
        this.setState({
            playerIsInVehicle: true,
            playerDrivingType: type,
        });

        DialogManager.dismiss(() => {});
    }

    async endStationSelected(station) {
        const { playerDrivingType, player, gameSession } = this.state;
        this.setState({
            playerIsInVehicle: false,
        });

        let move = {
            StationId: station.stationId,
            VehicleType: playerDrivingType
        };

        await postPlayerMove(gameSession.id, player.id, move);
        await this.loadMapElements();

        DialogManager.dismiss(() => {});
    }

    async openCompleteMovementDialog() {
        let stations = await this.getStationsNearToPlayer();
        const { playerDrivingType } = this.state;
        DialogManager.show({
            title: 'Leave ' + playerDrivingType + '  at which station?',
            titleAlign: 'center',
            animationDuration: 200,
            ScaleAnimation: new ScaleAnimation(),
            children: (
                <SelectStationDialog onStationPressed={(station) => this.endStationSelected(station)}
                                     selectableStations={stations}/>
            ),
        }, () => {});
    }

    async getStationsNearToPlayer() {
        let playerLocation = await getLocationAsync();
        return await fetchStations(playerLocation.coords, 1000);
    }
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    map: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1
    },
});
