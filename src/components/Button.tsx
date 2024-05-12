import React, { forwardRef } from "react";  
import { Pressable, View, Text, StyleSheet } from "react-native";


type ButtonProps = {
    text: string;
} & React.ComponentProps<typeof Pressable>;

const Button = forwardRef<View | null, ButtonProps>(
    ({ text, ...pressableProps }, ref) => {
        return (
            <Pressable
                style={[styles.container, { borderColor: 'black' }]}
                ref={ref}
                {...pressableProps}
            >
                <Text style={[styles.text, { color: 'black' }]}>
                    {text}
                </Text>
            </Pressable>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
        padding: 15,
        alignItems: 'center',
        borderRadius: 100,
        marginVertical: 10,
        borderWidth: 1,
        alignSelf: 'center',
        paddingHorizontal: 40,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default Button;
