import React from 'react';
import PropTypes from 'prop-types';
import {Text, View} from "react-native";

export default function GameSessionOverview({gameSession}) {
    return (
        <View>
            <Text>{gameSession.name}</Text>
            <Text>{gameSession.mrXId ? 1 : 0}/1 MrX</Text>
            <Text>{gameSession.policeOfficerIds.length}/6 Police Officers</Text>
        </View>
    );
}

GameSessionOverview.propTypes = {
    gameSession: PropTypes.object.isRequired,
};
