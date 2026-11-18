package com.fincore.loan_service.config;

import com.fincore.loan_service.client.CoreBankingClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${fincore.security.teller-password:Teller@123}")
    private String tellerPassword;

    @Value("${fincore.security.manager-password:Manager@123}")
    private String managerPassword;

    @Value("${fincore.security.admin-password:Admin@123}")
    private String adminPassword;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider(
            PasswordEncoder passwordEncoder,
            CoreBankingClient coreBankingClient) {
        return new AuthenticationProvider() {
            @Override
            public Authentication authenticate(Authentication authentication) throws AuthenticationException {
                String username = authentication.getName();
                String password = authentication.getCredentials() != null ? authentication.getCredentials().toString() : "";

                // Staff accounts
                if ("teller".equalsIgnoreCase(username) && (tellerPassword.equals(password) || passwordEncoder.matches(password, tellerPassword))) {
                    return new UsernamePasswordAuthenticationToken(
                            username, password,
                            List.of(new SimpleGrantedAuthority("ROLE_TELLER"),
                                    new SimpleGrantedAuthority("ROLE_MANAGER"),
                                    new SimpleGrantedAuthority("ROLE_ADMIN"))
                    );
                }
                if ("manager".equalsIgnoreCase(username) && (managerPassword.equals(password) || passwordEncoder.matches(password, managerPassword))) {
                    return new UsernamePasswordAuthenticationToken(
                            username, password,
                            List.of(new SimpleGrantedAuthority("ROLE_MANAGER"))
                    );
                }
                if ("admin".equalsIgnoreCase(username) && (adminPassword.equals(password) || passwordEncoder.matches(password, adminPassword))) {
                    return new UsernamePasswordAuthenticationToken(
                            username, password,
                            List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                    );
                }

                // Customer accounts validated via Core Banking Service
                if (coreBankingClient.validateCredentials(username, password)) {
                    return new UsernamePasswordAuthenticationToken(
                            username, password,
                            List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
                    );
                }

                throw new BadCredentialsException("Invalid username or password");
            }

            @Override
            public boolean supports(Class<?> authentication) {
                return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
            }
        };
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, AuthenticationProvider authenticationProvider) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/loans/applications").hasAnyRole("CUSTOMER", "TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/loans/applications/**").hasAnyRole("CUSTOMER", "TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/loans/applications/*/approve").hasAnyRole("MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/loans/applications/*/reject").hasAnyRole("MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/loans/emi/calculate").hasAnyRole("CUSTOMER", "TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/loans/**").hasAnyRole("CUSTOMER", "TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/loans/*/prepay").hasAnyRole("CUSTOMER", "TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/loans/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/loans/portfolio").hasAnyRole("MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/loans/collections/**").hasAnyRole("MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/loans/collections/**").hasAnyRole("MANAGER", "ADMIN")
                .anyRequest().authenticated()
            )
            .httpBasic(withDefaults());
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("X-Cache", "X-Latency", "X-Response-Time-Ms", "Idempotency-Key", "Content-Disposition"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
